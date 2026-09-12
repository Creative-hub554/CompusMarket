#!/usr/bin/env node
/**
 * backup.mjs — on-demand snapshot of the canonical stack's data.
 *
 *   node scripts/backup.mjs                       # snapshot all three
 *   node scripts/backup.mjs --only postgres       # postgres|meilisearch|minio
 *   node scripts/backup.mjs --retention-days 14   # override retention
 *
 * Writes date-stamped artifacts to output/backups/<YYYY-MM-DD>/ (multiple
 * runs per day are distinguished by an HHmmss suffix):
 *   postgres-HHmmss.dump.gz    — pg_dump custom format, gzipped
 *   meilisearch-HHmmss.dump    — Meilisearch dump (its own compressed format)
 *   minio-HHmmss.tar.gz        — tar.gz of the MinIO bucket mirror
 *   manifest.txt               — per-run status and sizes (no secret values)
 *
 * Credentials are read from docker/.env into command arguments/env only —
 * never printed, never echoed into logs. The MinIO mirror runs inside the
 * minio container (its own env, mc binary guaranteed) and is copied out.
 * Retention keeps the newest BACKUP_RETENTION_DAYS (default 7) YYYY-MM-DD
 * directories; unrelated folders in output/backups are never touched.
 * Exit 0 only if every requested snapshot succeeded.
 */
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { ROOT, dockerEnv } from "./lib/env.mjs";

const OUT = path.join(ROOT, "output", "backups");
const DOCKER_ENV = dockerEnv();
const args = process.argv.slice(2);
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const retIdx = args.indexOf("--retention-days");
const RETENTION_DAYS = Number(args[retIdx + 1] || DOCKER_ENV.BACKUP_RETENTION_DAYS || 7);

const PG_CONTAINER = "champey-postgres-1";
const MEILI_CONTAINER = "champey-meilisearch-1";
const MINIO_CONTAINER = "champey-minio-1";
const PG_USER = "theo";
const PG_DB = "theo_platform";
const MEILI_HOST = "http://127.0.0.1:7700";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const DAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const STAMP = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const DEST = path.join(OUT, DAY);
mkdirSync(DEST, { recursive: true });
const manifest = path.join(DEST, "manifest.txt");
const log = (msg) => {
  console.log(msg);
  appendFileSync(manifest, `${new Date().toISOString()} ${msg}\n`);
};

const firstLine = (e) => String(e?.message ?? e).split("\n")[0].slice(0, 140);
const kib = (f) => (statSync(f).size / 1024).toFixed(1) + " KiB";
let failed = 0;

function docker(args, opts = {}) {
  return execFileSync("docker", args, { timeout: 600_000, ...opts });
}

// ---- 1. Postgres ---------------------------------------------------------------
if (!ONLY || ONLY === "postgres") {
  try {
    const dump = docker(["exec", PG_CONTAINER, "pg_dump", "-U", PG_USER, "-d", PG_DB, "-Fc"]);
    const file = path.join(DEST, `postgres-${STAMP}.dump.gz`);
    writeFileSync(file, gzipSync(dump, { level: 6 }));
    log(`postgres: OK -> ${path.basename(file)} (${kib(file)})`);
  } catch (e) {
    failed++;
    log(`postgres: FAILED (${firstLine(e)})`);
  }
}

// ---- 2. Meilisearch ---------------------------------------------------------------
if (!ONLY || ONLY === "meilisearch") {
  try {
    const key = DOCKER_ENV.MEILI_MASTER_KEY;
    if (!key) throw new Error("MEILI_MASTER_KEY missing in docker/.env");
    const auth = ["-H", `Authorization: Bearer ${key}`];
    const res = execFileSync("curl", ["-s", "-m", "15", "-X", "POST", ...auth, `${MEILI_HOST}/dumps`], {
      encoding: "utf8",
    });
    const taskUid = JSON.parse(res).taskUid;
    if (taskUid === undefined) throw new Error(`unexpected /dumps response`);
    let dumpUid = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const t = JSON.parse(
        execFileSync("curl", ["-s", "-m", "10", ...auth, `${MEILI_HOST}/tasks/${taskUid}`], { encoding: "utf8" })
      );
      if (t.status === "succeeded") {
        dumpUid = t.details.dumpUid;
        break;
      }
      if (t.status === "failed") throw new Error(`dump task failed: ${t.error?.message ?? "?"}`);
    }
    if (!dumpUid) throw new Error("dump task timed out after 30s");
    const file = path.join(DEST, `meilisearch-${STAMP}.dump`);
    docker(["cp", `${MEILI_CONTAINER}:/meili_data/dumps/${dumpUid}.dump`, file]);
    log(`meilisearch: OK -> ${path.basename(file)} (${kib(file)})`);
  } catch (e) {
    failed++;
    log(`meilisearch: FAILED (${firstLine(e)})`);
  }
}

// ---- 3. MinIO -----------------------------------------------------------------------
if (!ONLY || ONLY === "minio") {
  try {
    const bucket = DOCKER_ENV.MINIO_BUCKET;
    if (!bucket) throw new Error("MINIO_BUCKET missing in docker/.env");
    // Mirror inside the container (its own env supplies the credentials),
    // then copy the snapshot out and clean up on both sides.
    const snap = `/tmp/champey-backup-${STAMP}`;
    docker([
      "exec", MINIO_CONTAINER, "sh", "-c",
      `mc alias set bkp http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && ` +
        `rm -rf ${snap} && mkdir -p ${snap} && mc mirror --overwrite "bkp/${bucket}" ${snap}`,
    ]);
    const tmpDir = path.join(ROOT, "output", `.minio-snap-${STAMP}`);
    rmSync(tmpDir, { recursive: true, force: true });
    docker(["cp", `${MINIO_CONTAINER}:${snap}`, tmpDir]);
    const file = path.join(DEST, `minio-${STAMP}.tar.gz`);
    // Relative paths only: GNU tar on Windows treats "C:\..." as a remote host.
    const tmpRel = path.relative(DEST, tmpDir);
    execFileSync("tar", ["-czf", path.basename(file), "-C", tmpRel, "."], { cwd: DEST });
    rmSync(tmpDir, { recursive: true, force: true });
    docker(["exec", MINIO_CONTAINER, "rm", "-rf", snap]);
    log(`minio: OK -> ${path.basename(file)} (bucket '${bucket}', ${kib(file)})`);
  } catch (e) {
    failed++;
    log(`minio: FAILED (${firstLine(e)})`);
  }
}

// ---- 4. Retention ---------------------------------------------------------------------
try {
  const dirs = readdirSync(OUT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort();
  const stale = RETENTION_DAYS > 0 ? dirs.slice(0, Math.max(0, dirs.length - RETENTION_DAYS)) : [];
  for (const d of stale) {
    rmSync(path.join(OUT, d), { recursive: true, force: true });
    log(`retention: pruned ${d}`);
  }
  log(`retention: keeping ${dirs.length - stale.length} day dir(s)`);
} catch (e) {
  log(`retention: skipped (${firstLine(e)})`);
}

log(`backup run done (failed=${failed})`);
console.log(
  failed ? `\nBACKUP INCOMPLETE — see ${path.relative(ROOT, manifest)}` : `\nBACKUP OK -> ${path.relative(ROOT, DEST)}`
);
process.exit(failed ? 1 : 0);
