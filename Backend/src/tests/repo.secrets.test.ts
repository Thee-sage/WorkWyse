/**
 * Repository hygiene checks that run as part of the normal test suite.
 *
 * A credential committed to git is the one security failure that cannot be
 * undone by a later fix: once it is in history it must be rotated, and if
 * the repository was ever public it must be treated as disclosed. Catching
 * it before the commit lands is the only cheap moment.
 *
 * These run against the working tree rather than against git history, so
 * they gate what is about to be committed.
 */

import fs from 'fs';
import path from 'path';

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

const SCANNED_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml']);
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
  'coverage',
  'out',
]);

/** Collect every source file under a directory, skipping build output. */
function collectSourceFiles(root: string): string[] {
  const results: string[] = [];

  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(full);
      } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
        // Lockfiles are enormous and contain only registry metadata.
        if (entry.name === 'package-lock.json') continue;
        results.push(full);
      }
    }
  };

  walk(root);
  return results;
}

/**
 * Patterns for credential material.
 *
 * Each is written to match a real secret rather than the word that names
 * one, so that `env.JWT_SECRET` and `password: hashedPassword` do not
 * register. The test files themselves use obvious fixtures, and are excluded.
 */
/**
 * Documentation placeholders are secret-shaped by design.
 *
 * .env.example has to show the form of a connection string for it to be
 * useful, so a raw pattern match would flag it forever and train everyone
 * to ignore this test. Matches whose text is obviously a stand-in are
 * therefore discarded rather than reported.
 */
const PLACEHOLDER_MARKERS = [
  'your-', 'your_', 'yourname', 'changeme', 'example.com', '<', '${',
  'xxxx', 'placeholder', 'dummy', 'replace-me', 'test-', 'fake',
];

function isPlaceholder(text: string): boolean {
  const lowered = text.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker));
}

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: 'MongoDB connection string with inline credentials',
    pattern: /mongodb(\+srv)?:\/\/[^\s'"$:]+:[^\s'"@$]+@/,
  },
  { name: 'AWS access key id', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Slack token', pattern: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'Stripe live key', pattern: /sk_live_[0-9A-Za-z]{16,}/ },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'GitHub token', pattern: /gh[pousr]_[0-9A-Za-z]{36,}/ },
  { name: 'JSON Web Token literal', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
  {
    name: 'Gmail app password literal',
    pattern: /GMAIL_APP_PASSWORD\s*[:=]\s*['"][a-z]{16}['"]/i,
  },
];

describe('No credentials in tracked source', () => {
  const files = collectSourceFiles(path.join(BACKEND_ROOT, 'src'))
    .concat(collectSourceFiles(path.join(REPO_ROOT, 'frontend', 'src')))
    // The suite's own fixtures are deliberately secret-shaped.
    .filter((file) => !file.includes(`${path.sep}tests${path.sep}`));

  it('finds source files to scan', () => {
    // Guards against the walker silently returning nothing, which would
    // make every assertion below vacuously true.
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(SECRET_PATTERNS)('contains no $name', ({ pattern }) => {
    const offenders: string[] = [];

    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');
      const match = pattern.exec(contents);
      if (match && !isPlaceholder(match[0])) {
        offenders.push(`${path.relative(REPO_ROOT, file)}: ${match[0].slice(0, 24)}...`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('Environment files are not committable', () => {
  /** Read every .gitignore that could cover a path, nearest last. */
  function ignorePatterns(): string[] {
    const files = [
      path.join(REPO_ROOT, '.gitignore'),
      path.join(REPO_ROOT, 'frontend', '.gitignore'),
    ];

    return files
      .filter((file) => fs.existsSync(file))
      .flatMap((file) =>
        fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'))
      );
  }

  it('ignores backend .env', () => {
    const patterns = ignorePatterns();
    expect(patterns.some((p) => ['.env', '**/.env', 'Backend/.env'].includes(p))).toBe(true);
  });

  it('ignores frontend env files', () => {
    const patterns = ignorePatterns();
    const covered = patterns.some((p) =>
      ['.env', '**/.env', 'frontend/.env', '.env*', '.env.local'].includes(p)
    );
    expect(covered).toBe(true);
  });

  it('keeps a .env.example that carries no real values', () => {
    const example = path.join(BACKEND_ROOT, '.env.example');
    expect(fs.existsSync(example)).toBe(true);

    const contents = fs.readFileSync(example, 'utf8');
    const real = SECRET_PATTERNS.map(({ name, pattern }) => {
      const match = pattern.exec(contents);
      return match && !isPlaceholder(match[0]) ? `${name}: ${match[0].slice(0, 24)}...` : null;
    }).filter(Boolean);

    expect(real).toEqual([]);
  });

  it('documents every variable the schema requires', () => {
    // A variable that exists in the schema but not in the example is one a
    // deployment will discover only when the container refuses to boot.
    const example = fs.readFileSync(path.join(BACKEND_ROOT, '.env.example'), 'utf8');
    const schema = fs.readFileSync(path.join(BACKEND_ROOT, 'src', 'config', 'env.ts'), 'utf8');

    const required = Array.from(schema.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*z\./gm))
      .map((match) => match[1])
      // Variables with a default do not have to be set by an operator.
      .filter((name) => {
        const line = schema.split('\n').find((l) => l.trim().startsWith(`${name}:`)) ?? '';
        return !line.includes('.default(') && !line.includes('.optional()');
      });

    const missing = required.filter((name) => !example.includes(name));
    expect(missing).toEqual([]);
  });
});
