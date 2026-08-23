# WorkWyse

A public record of what is known about job listings — not another job board, and not another "leave a star rating" review site.

WorkWyse exists because ghost listings, reposted postings, and unresponsive employers are common enough that any one person's experience reads as an anecdote. WorkWyse turns those experiences into a record: accounts, evidence, and votes accumulate against a specific listing or company over time, so a pattern becomes visible instead of staying invisible across a hundred separate job-seeker forum threads.

Every claim on the site is attached to who filed it (unless they've set their account to private) and what backs it up. Nothing is anonymous-by-default, and nothing is presented as fact without a source.

## What it actually does

- **Registry** — every tracked listing, filterable by signal: dead URL, reposted 2×+, has a first-hand account, thin record (fewer than 3 contributors), flagged likely fake.
- **Job records** — a listing's full page: posting details, a computed trust score, accounts filed against it, evidence with verification status, an on-demand URL liveness check, repost/duplicate detection across the whole registry, and a public log of everything that happened to that record.
- **Companies** — aggregated per-employer profiles: listings tracked, open reports, confirmed hires, employer reply rate, monthly posting patterns.
- **Contribute flow** — a guided wizard to open a new record from a URL (auto-extracted from the listing page), add an account, attach evidence, leave a company review, or file a challenge.
- **Accounts** — registration with OTP email verification, LinkedIn identity verification, password reset, public/private visibility (a private account is redacted to "Anonymous" wherever it's shown), and contributor tiers computed from how much of what you file holds up.
- **Notifications** — real per-user alerts: a challenge you filed was decided, an employer replied, evidence changed on a record you watch.
- **Moderation** — an evidence review queue and a report/challenge queue. A moderator can *propose* a decision on a report (capped at one per day) but cannot apply it unilaterally — every decision requires admin approval. The whole admin/moderation surface is unlisted in navigation and gated behind a passphrase second factor on top of the account role.
- **Extension API** *(not yet released)* — a separate, API-key-authenticated endpoint so a future browser extension can check a job URL against WorkWyse's data without exposing any private user data.

## Architecture

```
Workwyse/
├── Backend/     Express 5 + TypeScript API, MongoDB via Mongoose
├── frontend/    Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
└── .github/     CI workflow (typecheck, test, coverage gate, dependency audit)
```

The frontend is built to run on **Vercel**; the backend on **Azure App Service**. Because those are different registrable domains, the API's cookie and CORS configuration is deliberately cross-site-aware (`SameSite=None; Secure` in production, an explicit origin allowlist that supports Vercel preview-deployment wildcards) — see `Backend/src/middleware/cors.ts` and `Backend/src/utils/cookie.ts` for the reasoning, not just the settings.

### Backend

- **Express 5**, TypeScript, MongoDB/Mongoose
- Auth: short-lived JWT access tokens (in memory on the client, never `localStorage`) + a long-lived refresh token in an httpOnly cookie
- Validation: Zod schemas on every mutating route
- Security middleware: helmet, hpp, per-route rate limiting, SSRF-hardened outbound fetching (`Backend/src/utils/urlGuard.ts`) for anything that reads a user-supplied URL
- Observability: structured logging via winston, health (`/health`) and readiness (`/health/ready`) probes that reflect actual database connectivity, not just process liveness

### Frontend

- **Next.js 15** App Router, TypeScript, Tailwind CSS 4
- No client-side state library beyond React context — auth state and the toast system are the only global contexts
- API client (`frontend/src/lib/api.ts`) centralizes auth-token handling, automatic access-token refresh on a 401, and admin-unlock-token attachment for the routes that need it

## Getting started

### Prerequisites

- Node.js 20+
- A MongoDB instance (local, or a free MongoDB Atlas cluster)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (for OTP email delivery)

### 1. Install dependencies

```bash
cd Backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cd Backend
cp .env.example .env
```

Fill in `.env`. The required values (the app refuses to start without them):

| Variable | What it's for |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Two **distinct** secrets, 32+ chars each |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | OTP email delivery |
| `CORS_ORIGIN` | Your frontend's origin(s), comma-separated |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | LinkedIn identity verification |

Everything else in `.env.example` (rate limits, proxy trust hops, the admin passphrase, Cloudinary, TraceOps) has a safe default for local development or is documented inline where it doesn't.

**In production**, `ADMIN_ACCESS_PASSPHRASE` (16+ characters) is also required — it's the second factor gating the admin/moderation surface beyond just having an admin-role account. Startup fails without it once `NODE_ENV=production`.

### 3. Configure the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

This is the only environment variable the frontend needs. It must be set to your deployed API's `https://` origin before a production build — see [Deployment](#deployment).

### 4. Run it

```bash
# Backend — http://localhost:5000
cd Backend && npm run dev

# Frontend — http://localhost:3000
cd frontend && npm run dev
```

Optional: `cd Backend && npm run seed` populates demo data (sample listings, reviews, one seeded `admin` account) — useful for exploring the UI, not meant for a real deployment.

## The route surface

The API is organized by resource under `/api`. This isn't exhaustive parameter documentation — it's here so you know where to look.

| Area | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register → OTP verify → login, refresh, LinkedIn OAuth, password reset |
| Jobs / records | `/api/jobs` | registry listing, single record, evidence, votes, reviews, watch, URL extraction & liveness check |
| Companies | `/api/companies` | list, stats, patterns, reviews |
| Reports / challenges | `/api/reports` | file a report, moderator decision requests, admin approve/reject |
| Comments | `/api/jobs/:id/comments` | |
| Notifications | `/api/notifications` | list, unread count, mark read, delete |
| Activity | `/api/activity` | the public site-wide transparency log |
| Analytics | `/api/analytics` | public stats + an admin-only dashboard |
| Export | `/api/export` | CSV export/import for jobs and reports |
| Users | `/api/users` | public contributor stats |
| Admin | `/api/admin` | unlock (passphrase), user roles, extension API key issuance — all gated behind `authorize('admin')` **and** the unlock second factor |
| Extension | `/api/extension` | API-key-authenticated, not linked from the web app — see below |

## Security posture

This isn't a toy checklist — these are specific decisions made because of specific failure modes:

- **SSRF hardening** (`Backend/src/utils/urlGuard.ts`) — any endpoint that fetches a user-supplied URL (the job-URL extractor, the liveness checker, the extension lookup) resolves the hostname and validates the actual IP address, not just the URL string, before connecting. Blocks loopback, link-local (including the cloud metadata endpoint), and private ranges; every redirect hop is re-validated, not just the first request.
- **Cross-site auth done correctly for the Vercel/Azure split** — the refresh cookie is `httpOnly`, `SameSite=None`, `Secure` in production, scoped to `/api/auth` only. Access tokens never touch `localStorage`.
- **Rate limiting** is per-route and mostly per-authenticated-user (falls back to IP-keyed, IPv6-safe, for anonymous callers) — not one global bucket.
- **Admin/moderation is a two-layer gate**: an `authorize('admin')` role check, *and* a separate passphrase-derived unlock token bound to that specific admin's account (can't be replayed by another admin), required on top of the role. Report decisions specifically require a second human: a moderator can only request one, an admin has to approve it.
- **Fail-fast configuration checks** (`Backend/src/config/env.ts`) — the app refuses to boot in production with a wildcard CORS origin, an `http://` CORS origin, matching JWT secrets, SSRF protection disabled, or a missing/placeholder admin passphrase. These are things that would otherwise fail silently and only show up as an incident.
- **No secrets in source or git history** — verified, not assumed. `.env` files are gitignored and have never been committed; there's an automated test (`Backend/src/tests/repo.secrets.test.ts`) that scans tracked source for credential-shaped strings on every run.

## Testing

```bash
cd Backend
npm run test         # run the suite
npm run test:coverage # with coverage
npm run verify        # typecheck + coverage + dependency audit — the full local gate
```

16 test suites cover: authentication and JWT forgery resistance, the full authorization matrix (every protected route × every role), SSRF resistance, injection resistance (NoSQL operator injection, prototype pollution, ReDoS), rate limiting, confidentiality (no credential material or internal errors ever leak in a response), deployment configuration invariants, and the extension API's key-based auth boundary.

CI (`.github/workflows/ci.yml`) runs typecheck, the full test suite with coverage thresholds, and a dependency audit on every push and pull request — plus a scheduled weekly run so a new advisory in an existing dependency doesn't go unnoticed between pushes.

## Deployment

- **Frontend → Vercel.** `NEXT_PUBLIC_API_URL` must be set to the deployed API's `https://` origin — the build fails deliberately (see `frontend/next.config.ts`) if it's missing, `http://`, or still pointing at `localhost`, so a misconfigured production build can't ship silently.
- **Backend → Azure App Service.** Point Azure's health check at `/health/ready`, not `/health` — the latter only confirms the process is alive, the former confirms the database connection is actually up, which is what determines whether an instance should receive traffic. `TRUST_PROXY_HOPS=1` is correct for a stock App Service; raise it only if you add Front Door or another proxy layer in front.

## Project status

Actively developed. The visual design intentionally does not change often; most recent work has focused on restoring and hardening functionality — notifications, the account/privacy settings that exist but need surfacing, the admin lockdown, mobile navigation — rather than reskinning what's already there.

## License

MIT
