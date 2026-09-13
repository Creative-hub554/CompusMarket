#!/usr/bin/env node
/**
 * sync-dev-env.mjs — propagate canonical secrets into host-dev app env files.
 *
 * Single source of truth: docker/.env (consumed by the Docker stack and by
 * `pnpm dev` through this script). Run after changing any secret:
 *
 *   node scripts/sync-dev-env.mjs          # update app env files
 *   node scripts/sync-dev-env.mjs --check  # exit 1 if drift (CI-able)
 *
 * Rules:
 *   - Keys present in BOTH docker/.env and an app env file are updated.
 *   - Keys only in docker/.env are NOT appended (apps keep their own extras).
 *   - Keys not in docker/.env (e.g. Clerk, vendor keys) are left untouched.
 *   - Service hostnames are rewritten to localhost for host-side files
 *     (DATABASE_URL postgres:5432 -> localhost:5432, etc.) because inside
 *     the Docker network services talk via service names.
 *   - The repo-root .env (read by `docker compose` for ${...} interpolation,
 *     e.g. the monitoring profile's Grafana credentials and scrape token)
 *     mirrors a fixed key list verbatim from docker/.env; missing keys are
 *     appended, changed keys are updated.
 *   - Never prints values.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib/env.mjs";

// docker-network hostname -> localhost, for values written to HOST env files.
const SERVICE = "(postgres|redis|meilisearch|minio|backend)";
const toHostValue = (key, value) => {
  if (key === "MINIO_ENDPOINT") return value.replace(/^minio$/, "localhost");
  // postgresql://theo:pw@postgres:5432/db  ->  @localhost:
  // redis://:pw@redis:6379, http://meilisearch:7700  ->  //localhost:
  return value
    .replace(new RegExp("@" + SERVICE + ":", "g"), "@localhost:")
    .replace(new RegExp("//" + SERVICE + ":", "g"), "//localhost:");
};

const args = process.argv.slice(2);
const check = args.includes("--check");
// All paths resolve from the repo root, not the caller's cwd.
const at = (p) => resolve(ROOT, p);

const parse = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
    : [];

const canonical = parse(at("docker/.env"));
if (!canonical.length) {
  console.error("docker/.env missing or empty — nothing to sync from.");
  process.exit(1);
}
const canonicalKeys = new Set(canonical.map(([k]) => k));

const targets = [
  "packages/database/.env",
  "apps/backend/.env",
  "apps/frontend/.env",
  "apps/admin/.env",
];

// Repo-root .env: verbatim mirrors for docker compose ${...} interpolation
// (monitoring profile in compose.override.yaml). docker compose reads THIS
// file — not docker/.env — for variable substitution, so these keys must
// match docker/.env exactly (no hostname rewriting applies).
const ROOT_ENV_FILE = at(".env");
const ROOT_ENV_KEYS = [
  "POSTGRES_PASSWORD", // postgres-exporter DSN (via output/metrics-dsn.txt)
  "METRICS_TOKEN", // compose environment secret -> prometheus scrape auth
  "GRAFANA_ADMIN_USER",
  "GRAFANA_ADMIN_PASSWORD",
];

let drift = false;
for (const target of targets) {
  const file = at(target);
  if (!existsSync(file)) continue; // apps without an env file: nothing to sync
  const entries = parse(file);
  const changed = [];
  for (const [key] of entries) {
    if (!canonicalKeys.has(key)) continue;
    const want = toHostValue(key, canonical.find(([k]) => k === key)[1]);
    const have = entries.find(([k]) => k === key)[1];
    if (have !== want) changed.push(key);
  }

  const base = target.replace(/^apps\//, "").replace("packages/database", "database");
  if (check) {
    if (changed.length) {
      drift = true;
      console.log(`${base}: DRIFT (stale: ${changed.join(", ")})`);
    } else {
      console.log(`${base}: in sync`);
    }
    continue;
  }

  if (!changed.length) {
    console.log(`${base}: already in sync (no changes)`);
    continue;
  }
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const updated = lines.map((l) => {
    const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!m || !changed.includes(m[1])) return l;
    return `${m[1]}=${toHostValue(m[1], canonical.find(([k]) => k === m[1])[1])}`;
  });
  writeFileSync(file, updated.join("\r\n"));
  console.log(`${base}: updated ${changed.join(", ")}`);
}

// ---- root .env: compose interpolation mirrors ------------------------------
{
  const entries = new Map(parse(ROOT_ENV_FILE));
  const upsert = [];
  for (const key of ROOT_ENV_KEYS) {
    if (!canonicalKeys.has(key)) continue; // nothing canonical to mirror
    const want = canonical.find(([k]) => k === key)[1];
    if (entries.get(key) !== want) upsert.push(key);
  }
  const absent = ROOT_ENV_KEYS.filter((k) => !canonicalKeys.has(k));
  if (check) {
    if (upsert.length) {
      drift = true;
      console.log(
        `root .env: DRIFT (${upsert
          .map((k) => (entries.has(k) ? `stale: ${k}` : `missing: ${k}`))
          .join(", ")})`
      );
    } else {
      console.log("root .env: in sync");
    }
  } else if (upsert.length) {
    const lines = existsSync(ROOT_ENV_FILE)
      ? readFileSync(ROOT_ENV_FILE, "utf8").split(/\r?\n/)
      : [];
    for (const key of upsert) {
      const value = canonical.find(([k]) => k === key)[1];
      const idx = lines.findIndex((l) => l.startsWith(key + "="));
      if (idx === -1) lines.push(`${key}=${value}`);
      else lines[idx] = `${key}=${value}`;
    }
    writeFileSync(ROOT_ENV_FILE, lines.join("\r\n"));
    console.log(`root .env: updated ${upsert.join(", ")}`);
  } else {
    console.log("root .env: already in sync");
  }
  for (const key of absent) {
    console.log(
      `  note: ${key} missing in docker/.env — compose default applies` +
        (key === "METRICS_TOKEN"
          ? " (add METRICS_TOKEN to docker/.env or backend metrics scrape stays unauthorized)"
          : "")
    );
  }
}

if (check) {
  console.log(drift ? "\nDRIFT DETECTED — run: node scripts/sync-dev-env.mjs" : "\nAll in sync with docker/.env");
  process.exit(drift ? 1 : 0);
}
