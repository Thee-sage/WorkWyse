# Backend deployment — Azure App Service

Target: **`workwyse-api`** (resource group `workwyse-rg`, Southeast Asia, Linux B1, `NODE|22-lts`)
Live: <https://workwyse-api.azurewebsites.net>

This document records how the backend is deployed, and — more importantly — the
two failures that made deployment look impossible on 2026-08-23, so neither has
to be diagnosed from scratch again.

---

## TL;DR — the deploy that works

Build locally, ship a **prebuilt** artifact, never let Azure build it.

```powershell
# 1. Compile
cd D:\Workwyse\Backend
npm run build

# 2. Stage dist + production-only deps
$SP = "$env:TEMP\workwyse-deploy"
Remove-Item "$SP\stage" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$SP\stage" | Out-Null
Copy-Item dist "$SP\stage\dist" -Recurse
Copy-Item package.json,package-lock.json,.npmrc "$SP\stage\"
cd "$SP\stage"; npm ci --omit=dev

# 3. Zip with POSIX paths (see "Pitfall 2" — do NOT use Compress-Archive)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = "$SP\backend-deploy.zip"
if (Test-Path $zip) { [System.IO.File]::Delete($zip) }
$sep  = [System.IO.Path]::DirectorySeparatorChar
$root = (Resolve-Path "$SP\stage").Path
if (-not $root.EndsWith($sep)) { $root += $sep }
$a = [System.IO.Compression.ZipFile]::Open($zip,'Create')
foreach ($f in Get-ChildItem "$SP\stage" -Recurse -File -Force) {
  $rel = $f.FullName.Substring($root.Length).Replace($sep,'/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($a,$f.FullName,$rel,'Optimal') | Out-Null
}
$a.Dispose()

# 4. Deploy
az webapp deploy --resource-group workwyse-rg --name workwyse-api `
  --src-path $zip --type zip --clean true --restart true --timeout 900
```

Expect `"status": "RuntimeSuccessful"` and `Site started successfully`.

### Verify

```bash
curl -s https://workwyse-api.azurewebsites.net/health        # {"status":"OK"}
curl -s https://workwyse-api.azurewebsites.net/health/ready  # {"status":"READY","checks":{"database":"connected"}}
```

`GET /` returning **404 is correct** — there is no root route. Everything lives
under `/api/*`, plus the two `/health` endpoints.

---

## Pitfall 1 — Oryx tried to build and failed with `tsc: not found`

**Symptom:** the site returns `503`, the container exits with code 1 during
startup, and the deployment log ends with
`Deployment Failed. deployer = OneDeploy`. The real cause is buried in the Kudu
trace:

```
sh: 1: tsc: not found
/bin/bash -c "oryx build /tmp/zipdeploy/extracted -o /home/site/wwwroot ..."
```

**Why:** with `SCM_DO_BUILD_DURING_DEPLOYMENT=true`, Azure's Oryx builder runs
`npm run build` on the App Service itself. That script is `tsc`, but TypeScript
is a devDependency and Oryx installs production dependencies only. The build
dies partway through, leaving `/home/site/wwwroot` incomplete — so the container
has no working `dist/app.js` to start, and crash-loops.

**Fix:** build on the developer machine (or in CI), ship the compiled output,
and keep the setting off:

```bash
az webapp config appsettings set -n workwyse-api -g workwyse-rg \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false
```

Because a partial Oryx build leaves `wwwroot` dirty, the first recovery deploy
must pass **`--clean true`** to wipe it. Without that, stale files survive and
the crash-loop continues even after a good artifact is pushed.

---

## Pitfall 2 — `Compress-Archive` produces a zip Kudu cannot extract

**Symptom:** `az webapp deploy` fails almost immediately with

```
Kudu Status : 400
Error Code  : DeploymentFailed
Last Step   : HTTP request sent to deployment API
```

**Why:** Windows PowerShell 5.1's `Compress-Archive` writes entry names using
the **Windows** separator, so the archive contains `dist\app.js` instead of
`dist/app.js`. On the failing artifact, 10,496 of 10,499 entries were affected.
Kudu extracts on Linux, where a backslash is a legal filename character rather
than a path separator, so the package is rejected as invalid.

**Fix:** build the zip through `System.IO.Compression` and normalise every entry
name to forward slashes (step 3 above). Verify before deploying:

```powershell
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$v = [System.IO.Compression.ZipFile]::OpenRead($zip)
($v.Entries | Where-Object { $_.FullName -like '*\*' }).Count   # must be 0
$v.Dispose()
```

Anything other than `0` will fail with Kudu 400.

---

## Artifact contents

Ship exactly these; nothing else is needed at runtime:

| Path | Notes |
| --- | --- |
| `dist/` | `tsc` output; entrypoint is `dist/app.js` |
| `node_modules/` | production only (`npm ci --omit=dev`) — ~251 packages |
| `package.json` | supplies the `start` script |
| `package-lock.json`, `.npmrc` | `.npmrc` sets `legacy-peer-deps`, needed because `traceops-sdk` declares a peer dep on express@4 while this app runs express@5 |

**Never ship `.env`.** It is gitignored and must stay out of the artifact —
configuration comes from App Service application settings. `dotenv` does not
overwrite variables that already exist in the environment, so a stray `.env`
would not even take effect; it would only put secrets on disk in production.

---

## Runtime configuration

Startup command (App Service → Configuration → General settings):

```
node --dns-result-order=ipv4first dist/app.js
```

Non-secret settings that must hold, and what breaks if they don't:

| Setting | Value | Consequence if wrong |
| --- | --- | --- |
| `NODE_ENV` | `production` | enables the fail-fast safety checks in `src/config/env.ts` |
| `PORT` | `8080` | App Service proxies to this port; a mismatch fails the startup probe |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | see Pitfall 1 |
| `CORS_ORIGIN` | `https://www.workwyse.tech,https://workwyse.tech` | see the CORS warning below |
| `LINKEDIN_REDIRECT_URI` | `https://workwyse-api.azurewebsites.net/auth/linkedin/callback` | must match both the deployed app **and** the LinkedIn developer app, or OAuth fails |

Secrets (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RESEND_API_KEY`,
`ADMIN_ACCESS_PASSPHRASE`, LinkedIn and Cloudinary credentials) live only in
App Service settings. `src/config/env.ts` validates every one at boot and
**refuses to start** on a misconfiguration rather than running in an unsafe
state — so a startup crash is often a config error, not a code error. Read the
container log; it names the offending variable.

### Reading settings without leaking them

`az webapp config appsettings set` prints the whole settings list back with
every `value` shown as `null`. **That is the CLI redacting secrets, not the
values being erased.** To confirm a setting exists without printing it:

```bash
az webapp config appsettings list -n workwyse-api -g workwyse-rg \
  --query "length([?name=='RESEND_API_KEY' && value!=''])" -o tsv   # 1 = set
```

### CORS is credentialed — never put a placeholder in it

`CORS_ORIGIN` is an exact-match allowlist, and responses carry
`Access-Control-Allow-Credentials: true`. A literal placeholder such as
`https://YOUR-APP.vercel.app` is therefore a real vulnerability, not just
untidy: any Vercel user can claim that subdomain, and would then hold a
credentialed cross-origin grant against this API — able to issue authenticated
requests with a logged-in user's cookies and read the responses. Only ever add
origins you control.

Confirm the allowlist behaves:

```bash
# allowed -> 204
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  https://workwyse-api.azurewebsites.net/api/auth/login \
  -H "Origin: https://www.workwyse.tech" -H "Access-Control-Request-Method: POST"

# unknown -> 403
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS \
  https://workwyse-api.azurewebsites.net/api/auth/login \
  -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST"
```

---

## Diagnosing a failed deploy

```bash
# live container + deployment log stream
az webapp log tail -n workwyse-api -g workwyse-rg

# what the deployment engine recorded
az webapp log deployment show -n workwyse-api -g workwyse-rg
```

Reading the stream:

- `ContainerStartupFailure` / `Container exited with exit code 1` — the artifact
  deployed but the app refused to boot. Check the env-validation output.
- Kudu `400 BadRequest` with an Oryx stack trace — the artifact itself was
  rejected. See the two pitfalls above.
- `tar: ... time stamp ... is N s in the future` — harmless clock skew between
  the build machine and the App Service.

---

## CI deployment

`.github/workflows/deploy-backend.yml` performs the same sequence
(`npm ci` → `typecheck` → `build` → `npm prune --omit=dev` → zip → deploy) on
every push touching `Backend/**`, using `azure/webapps-deploy@v2` with a publish
profile. It builds on a Linux runner, so Pitfall 2 does not apply there.

It requires the repository secret **`AZURE_PUBLISH_PROFILE`**
(Settings → Secrets and variables → Actions). The workflow checks for it
explicitly and fails with a clear message, because `webapps-deploy` otherwise
reports a missing profile as the misleading *"No credentials found. Add an Azure
login action"*, which reads like a workflow authoring bug rather than an unset
secret.

Retrieve the profile with:

```bash
az webapp deployment list-publishing-profiles -n workwyse-api -g workwyse-rg --xml
```

Treat that output as a credential: it is gitignored as `PUBLISH-PROFILE.txt` and
`*.PublishSettings`, and must never be committed.

Until that secret is set, the manual path at the top of this document is the
supported way to deploy.
