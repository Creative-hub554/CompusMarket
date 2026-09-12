#!/usr/bin/env node
/**
 * metrics-server.mjs — serve stack-health metrics for Prometheus/Grafana.
 *
 *   node scripts/metrics-server.mjs                # 127.0.0.1:9701, refresh every 5 min
 *   CHAMPEY_METRICS_PORT=9701 CHAMPEY_METRICS_INTERVAL_MS=300000 node scripts/metrics-server.mjs
 *
 * - Serves GET /metrics (Prometheus exposition format) on 127.0.0.1 only.
 * - Response = `champey_metrics_server_up 1` + the latest metrics file written by
 *   `health-check.mjs --metrics-out output/health-metrics.prom` (atomic rename,
 *   so a concurrent writer can never yield a partial body).
 * - Every CHAMPEY_METRICS_INTERVAL_MS (default 5 min) it re-runs the FULL health
 *   check in fix mode — the same auto-repair the scheduled task and `start.bat
 *   stack` perform — so breakage is repaired and visible in Grafana within
 *   minutes, not just at the 08:00 scheduled run.
 * - A lockfile prevents overlapping runs when the scheduled task or start.bat
 *   fire at the same time. Never prints secret values (health-check guarantees).
 */
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { ROOT, dockerEnv } from "./lib/env.mjs";

const PORT = Number(process.env.CHAMPEY_METRICS_PORT || 9701);
const INTERVAL_MS = Number(process.env.CHAMPEY_METRICS_INTERVAL_MS || 5 * 60_000);
const METRICS_FILE = path.join(ROOT, "output", "health-metrics.prom");
const LOCK_FILE = path.join(ROOT, "output", "health-check.lock");
const LOG_FILE = path.join(ROOT, "output", "metrics-server.log");
// DSN file for postgres-exporter (compose.override.yaml mounts it ro).
// v0.15.0 of the exporter has no DATA_SOURCE_NAME_FILE support for
// interpolation, so the file is rewritten here from the canonical docker/.env
// whenever it changes (e.g. after a password rotation).
const DSN_FILE = path.join(ROOT, "output", "metrics-dsn.txt");
let lastDsn = null;
const LOCK_STALE_MS = 10 * 60_000;

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    let s = [];
    try {
      s = readFileSync(LOG_FILE, "utf8").split("\n");
    } catch {
      s = []; // first line ever
    }
    s.push(line);
    writeFileSync(LOG_FILE, s.slice(-500).join("\n")); // cap log size
  } catch {
    /* logging must never break serving */
  }
};

function lockHeld() {
  try {
    const { pid, at } = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
    if (Date.now() - at > LOCK_STALE_MS) return false; // stale lock from a killed run
    try {
      process.kill(pid, 0); // throws if the owner is gone
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function writeDsnFile() {
  try {
    const dsn = dockerEnv().DATABASE_URL;
    if (!dsn) return;
    if (dsn === lastDsn) return;
    const rotated = lastDsn !== null;
    mkdirSync(path.dirname(DSN_FILE), { recursive: true });
    writeFileSync(DSN_FILE, dsn);
    try {
      chmodSync(DSN_FILE, 0o600);
    } catch {
      /* best-effort on platforms without chmod */
    }
    log(rotated ? "[dsn] DATABASE_URL changed — recreating postgres-exporter" : "[dsn] postgres-exporter DSN file written (value never logged)");
    lastDsn = dsn;
    if (rotated) {
      const r = spawnSync("docker", ["compose", "up", "-d", "--force-recreate", "postgres-exporter"], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 120_000,
      });
      log(`[dsn] postgres-exporter recreate ${r.status === 0 ? "ok" : `FAILED (exit ${r.status})`}`);
    }
  } catch (e) {
    log(`[dsn] could not write DSN file: ${e.message}`);
  }
}

function runHealthCheckOnce() {
  if (lockHeld()) {
    log("[skip] another health-check run holds the lock (scheduled task or start.bat)");
    return;
  }
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: Date.now() }));
  } catch {
    /* proceed without lock */
  }
  log("[run] health check (fix mode) starting...");
  const child = spawn(process.execPath, [path.join(ROOT, "scripts", "health-check.mjs"), "--metrics-out", METRICS_FILE], {
    cwd: ROOT,
    stdio: "ignore",
    detached: false,
  });
  child.on("exit", (code) => {
    log(`[run] health check finished (exit_code=${code})`);
    writeDsnFile(); // pick up any credential changes the check revealed
    try {
      unlinkSync(LOCK_FILE);
    } catch {
      /* already gone */
    }
  });
}

function metricsBody() {
  let file = "";
  try {
    file = readFileSync(METRICS_FILE, "utf8");
  } catch {
    file = `# HELP champey_last_check_timestamp_seconds Unix timestamp of the last completed health check.\n# TYPE champey_last_check_timestamp_seconds gauge\nchampey_last_check_timestamp_seconds 0\n`;
  }
  return (
    `# HELP champey_metrics_server_up 1 if the stack-health metrics server is answering.\n` +
    `# TYPE champey_metrics_server_up gauge\n` +
    `champey_metrics_server_up 1\n` +
    file
  );
}

const server = createServer((req, res) => {
  if (req.url !== "/metrics" && !req.url.startsWith("/metrics?")) {
    res.writeHead(404).end("not found (use /metrics)\n");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
  res.end(metricsBody());
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    log(`[exit] port ${PORT} already serves metrics (another metrics-server) — exiting`);
    process.exit(0);
  }
  log(`[exit] server error: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  log(`metrics server listening on http://127.0.0.1:${PORT}/metrics (refresh every ${Math.round(INTERVAL_MS / 1000)}s)`);
  writeDsnFile(); // must exist before the compose monitoring profile starts
  runHealthCheckOnce(); // first sample immediately; serve while it runs
  setInterval(runHealthCheckOnce, INTERVAL_MS).unref();
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
