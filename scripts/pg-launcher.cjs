#!/usr/bin/env node
/**
 * Portable embedded-Postgres launcher for local preview.
 *
 * Replaces Freebuff's per-worktree .freebuff/pg/pg-launcher.cjs so any plain
 * checkout can boot the stack. Reads credentials from apps/backend/.env —
 * the same file the backend itself uses — so there is exactly one source of
 * truth and no duplicated secrets in the repo.
 *
 * Usage: node scripts/pg-launcher.cjs
 * Env overrides:
 *   EMBEDDED_PG_PORT   port to listen on (default: DATABASE_URL port or 5432)
 *   EMBEDDED_PG_CLEAN  set to 1 to wipe the data dir before starting (fresh DB)
 *
 * Data lives in .freebuff/pg-data and persists across restarts, so migrations
 * and seeded data survive. Logs lifecycle events to stdout:
 *   EMBEDDED_PG_READY   server accepting connections
 *   EMBEDDED_PG_STOPPED clean shutdown
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');

// WORKAROUND: embedded-postgres spawns initdb/postgres with an env containing
// ONLY LC_MESSAGES. On Windows a stripped env crashes initdb with 0xC0000409
// (no SystemRoot/PATH); verified directly. Patch spawn to merge the parent
// env back in — the library's own values still win. Must run BEFORE the
// dynamic import below so the ESM module picks up the patched function.
const originalSpawn = cp.spawn;
cp.spawn = function patchedSpawn(command, args, options) {
  if (
    process.platform === 'win32' &&
    options &&
    options.env &&
    !('SystemRoot' in options.env)
  ) {
    options = { ...options, env: { ...process.env, ...options.env } };
  }
  return originalSpawn.call(this, command, args, options);
};

const repoRoot = path.resolve(__dirname, '..');

// embedded-postgres is an ESM-only devDependency of packages/database; under
// pnpm's isolated node_modules it only resolves from inside that package.
const moduleDir = path.join(repoRoot, 'packages', 'database', 'node_modules', 'embedded-postgres');
const moduleEntry = path.join(moduleDir, 'dist', 'index.js');
if (!fs.existsSync(moduleEntry)) {
  console.error(`[pg-launcher] embedded-postgres not found at ${moduleDir}`);
  console.error('[pg-launcher] run: pnpm --filter @theo/database install');
  process.exit(1);
}

// --- Parse apps/backend/.env (single source of truth for DB credentials) ------
const envPath = path.join(repoRoot, 'apps', 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error('[pg-launcher] apps/backend/.env not found — it must define DATABASE_URL.');
  console.error('[pg-launcher] copy apps/backend/.env.example to apps/backend/.env and adjust it.');
  process.exit(1);
}

const dotenv = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) dotenv[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const databaseUrl = dotenv.DATABASE_URL;
if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
  console.error('[pg-launcher] DATABASE_URL missing or not postgres* in apps/backend/.env.');
  process.exit(1);
}

// Derive user/password/database from DATABASE_URL, falling back to explicit
// POSTGRES_* entries, then to sane local defaults.
let dbUser = 'postgres';
let dbPassword = 'postgres';
let dbDatabase = 'postgres';
let urlPort;
try {
  const parsed = new URL(databaseUrl);
  if (parsed.username) dbUser = decodeURIComponent(parsed.username);
  if (parsed.password) dbPassword = decodeURIComponent(parsed.password);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (dbName) dbDatabase = dbName;
  if (parsed.port) urlPort = Number(parsed.port);
} catch {
  console.error('[pg-launcher] DATABASE_URL is not a valid URL.');
  process.exit(1);
}

const dbUserFinal = dotenv.POSTGRES_USER || dbUser;
const dbPasswordFinal = dotenv.POSTGRES_PASSWORD || dbPassword;
const dbDatabaseFinal = dotenv.POSTGRES_DB || dbDatabase;
const port = Number(process.env.EMBEDDED_PG_PORT || urlPort || 5432);

// --- Persistent data dir -------------------------------------------------------
const dataDir = path.join(repoRoot, '.freebuff', 'pg-data');
if (process.env.EMBEDDED_PG_CLEAN === '1') {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`[pg-launcher] wiped data dir ${dataDir}`);
}

// --- Version-mismatch guard ------------------------------------------------------
const versionMarker = path.join(dataDir, 'PG_VERSION');
if (fs.existsSync(versionMarker)) {
  const existing = fs.readFileSync(versionMarker, 'utf8').trim();
  const expected = '17'; // embedded-postgres@17.x ships Postgres 17 binaries
  if (existing !== expected) {
    console.error(
      `[pg-launcher] data dir was created by Postgres ${existing} but this launcher ships ${expected}.`
    );
    console.error(`[pg-launcher] delete ${dataDir} (or set EMBEDDED_PG_CLEAN=1) and re-run: pnpm --filter @theo/database db:push`);
    process.exit(1);
  }
}

async function main() {
  // Dynamic import: embedded-postgres is ESM-only, so require() cannot load it.
  const mod = await import(pathToFileURL(moduleEntry).href);
  const EmbeddedPostgres = mod.default; // the module exports the class as default

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: dbUserFinal,
    password: dbPasswordFinal,
    port,
    persistent: true, // keep running until the process is killed
    // Force a UTF8 cluster: the schema stores emoji (e.g. Reaction.emoji
    // defaults to "👍") and Windows initdb would otherwise pick WIN1252,
    // which rejects 4-byte characters.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onError: (msgOrError) => console.error('[pg-launcher][postgres]', msgOrError || ''),
    onLog: (msg) => console.log('[pg-launcher][postgres]', msg || ''),
  });

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[pg-launcher] ${signal} received, stopping postgres...`);
    try {
      await pg.stop();
      console.log('EMBEDDED_PG_STOPPED');
    } catch (err) {
      console.error('[pg-launcher] error during stop:', err.message);
    }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  const initialise = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  if (initialise) {
    console.log(`[pg-launcher] initialising cluster in ${dataDir}`);
    await pg.initialise();
  }
  await pg.start();

  // Create the app database on first boot; ignore "already exists" races.
  try {
    await pg.createDatabase(dbDatabaseFinal);
    console.log(`[pg-launcher] created database ${dbDatabaseFinal}`);
  } catch (err) {
    if (!/already exists/i.test(String(err && err.message))) {
      console.error('[pg-launcher] createDatabase failed:', err.message);
    }
  }

  console.log(`[pg-launcher] postgres listening on :${port} (user=${dbUserFinal}, db=${dbDatabaseFinal})`);
  console.log('READY');
  console.log('EMBEDDED_PG_READY');

  // Keep the event loop alive while the stack runs.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error('[pg-launcher] failed to start postgres:', err);
  process.exit(1);
});
