#!/usr/bin/env node
/**
 * health-check.mjs — verify the champey stack and auto-repair known failure modes.
 *
 *   node scripts/health-check.mjs                          # verify + auto-fix
 *   node scripts/health-check.mjs --no-fix                 # report only, exit 1 if broken
 *   node scripts/health-check.mjs --metrics-out <file>     # also write Prometheus metrics
 *
 * Checks (in order), with auto-fixes applied between re-checks:
 *   1. Docker engine reachable
 *   2. All compose services running (fix: `docker compose up -d`)
 *   3. Postgres password matches docker/.env over real SCRAM auth
 *      (fix: ALTER USER + db-init + backend recreate)
 *   4. Container env is not stale vs docker/.env (fix: recreate)
 *   5. Container healthchecks pass (fix: recreate unhealthy service)
 *   6. HTTP endpoints answer (fix: recreate the affected service)
 *   7. Host app env files in sync with docker/.env (fix: sync-dev-env)
 *
 * Every check observes its own result directly; after the repair loop only the
 * services a fix touched (or that still fail) are re-verified to produce the
 * metrics — nothing is checked twice on the green path. Metrics:
 *   champey_stack_healthy, champey_service_healthy{service}, champey_postgres_auth_ok,
 *   champey_host_env_in_sync, champey_last_check_* — consumed by
 *   scripts/metrics-server.mjs for Prometheus/Grafana.
 *
 * Never prints secret values. Exit 0 = healthy (possibly after fixes),
 * exit 1 = still broken after attempts.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { ROOT, dockerEnv } from "./lib/env.mjs";

const argv = process.argv.slice(2);
const FIX = !argv.includes("--no-fix");
const metricsOutIdx = argv.indexOf("--metrics-out");
const METRICS_OUT = metricsOutIdx !== -1 ? argv[metricsOutIdx + 1] : null;
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const startedAt = Date.now();

const out = (icon, msg) => console.log(`${icon} ${msg}`);
const ok = (m) => out("[ok]  ", m);
const fix = (m) => out(FIX ? "[fix] " : "[need]", m);
const fail = (m) => out("[FAIL]", m);
const info = (m) => out("[..]  ", m);

function run(cmd, args, opts = {}) {
  try {
    const r = spawnSync(cmd, args, {
      encoding: "utf8",
      timeout: opts.timeout ?? 60_000,
      input: opts.input,
      shell: false,
    });
    return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  } catch {
    return { code: 1, stdout: "", stderr: "spawn failed" };
  }
}

async function httpStatus(url, timeoutMs = 8000) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, { redirect: "manual", signal: ac.signal });
    clearTimeout(t);
    return res.status;
  } catch {
    return 0;
  }
}

function composeServices() {
  const r = run("docker", ["compose", "ps", "--all", "--format", "json"]);
  const rows = [];
  const tryParse = (s) => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v : [v];
    } catch {
      return null;
    }
  };
  let parsed = tryParse(r.stdout);
  if (!parsed) {
    parsed = [];
    for (const line of r.stdout.split(/\r?\n/)) {
      if (line.trim()) {
        try {
          parsed.push(JSON.parse(line));
        } catch {
          /* skip */
        }
      }
    }
  }
  for (const p of parsed) {
    rows.push({
      name: p.Name || p.Service || "?",
      service: p.Service || (p.Name || "").replace(/^champey-|-1$/g, ""),
      state: p.State || "?",
      health: p.Health || null,
    });
  }
  return rows;
}

function serviceRunning(service) {
  const row = composeServices().find((x) => x.service === service);
  return row && (row.state === "running" || row.state === "healthy") ? row : null;
}

function containerEnvHash(service, key) {
  const r = run("docker", [
    "inspect", `champey-${service}-1`,
    "--format", "{{range .Config.Env}}{{println .}}{{end}}",
  ]);
  if (r.code !== 0) return null;
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith(key + "="));
  if (line === undefined) return null;
  let v = line.slice(key.length + 1);
  if (key === "DATABASE_URL") {
    try {
      v = decodeURIComponent(new URL(v).password);
    } catch {
      return null;
    }
  }
  return sha(v);
}

// Real SCRAM auth test from a throwaway container on the compose network —
// in-container socket/localhost checks bypass password verification entirely.
function pgScramOk() {
  const r = run(
    "docker",
    [
      "run", "--rm", "--network", "champey_default",
      "--env-file", path.join(ROOT, "docker", ".env"), "postgres:15",
      "sh", "-c",
      'PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U theo -d theo_platform -tAc "select 1"',
    ],
    { timeout: 90_000 }
  );
  return r.code === 0 && r.stdout.trim().endsWith("1");
}

function pgAlterPassword(newPassword) {
  const sql = `ALTER USER theo WITH PASSWORD '${newPassword.replace(/'/g, "''")}';`;
  const r = run("docker", ["exec", "-i", "champey-postgres-1", "psql", "-U", "theo", "-d", "theo_platform"], {
    input: sql,
  });
  return r.code === 0 && /ALTER ROLE/.test(r.stdout);
}

const SERVICES = ["postgres", "redis", "meilisearch", "minio", "backend", "frontend", "admin"];
const HTTP_CHECKS = [
  { service: "frontend", url: "http://localhost:3000/", accept: [200, 301, 302, 307, 308] },
  { service: "admin", url: "http://localhost:3001/", accept: [200, 301, 302, 307, 308] },
  { service: "backend", url: "http://localhost:4000/api/health/ready", accept: [200] },
];
const httpCheck = (service) => HTTP_CHECKS.find((c) => c.service === service);

let broken = false;
const markBroken = (m) => {
  broken = true;
  fail(m);
};
const composeUp = (args) => run("docker", ["compose", "up", "-d", ...args], { timeout: 300_000 });

// Services a fix touched or that still fail — the only ones re-verified for metrics.
const recheck = new Set();
let pgAuthWasOk = false;
let pgPasswordFixed = false;
let hostEnvInSync = false;

async function main() {
  console.log(`champey health check — ${new Date().toISOString()} (fix mode: ${FIX ? "ON" : "OFF"})`);
  const fileEnv = dockerEnv();

  // 1. Docker engine
  const engine = run("docker", ["ps"], { timeout: 20_000 });
  if (engine.code !== 0) {
    fail("Docker engine unreachable. Start Docker Desktop, then re-run this check.");
    writeMetrics({ engineUp: false });
    process.exit(1);
  }
  ok("Docker engine reachable");

  // 2. Compose services running
  info("checking compose services...");
  const missing = SERVICES.filter((s) => !serviceRunning(s));
  if (missing.length) {
    missing.forEach((s) => recheck.add(s));
    if (FIX) {
      fix(`starting missing services: ${missing.join(", ")}`);
      composeUp([]);
      for (let i = 0; i < 12; i++) {
        await sleep(5000);
        if (missing.every((s) => serviceRunning(s))) break;
      }
    }
    const still = SERVICES.filter((s) => !serviceRunning(s));
    if (still.length) markBroken(`services not running: ${still.join(", ")} (check: docker logs champey-<svc>-1)`);
    else ok("all services running");
  } else ok("all services running");

  // 3. Postgres password vs docker/.env (SCRAM)
  if (serviceRunning("postgres")) {
    info("testing postgres auth with docker/.env credentials (SCRAM)...");
    pgAuthWasOk = pgScramOk();
    if (pgAuthWasOk) {
      ok("postgres auth OK (SCRAM, credentials match docker/.env)");
    } else if (FIX && fileEnv.POSTGRES_PASSWORD) {
      recheck.add("postgres");
      fix("password drift: resetting theo password from docker/.env via trusted socket");
      const altered = pgAlterPassword(fileEnv.POSTGRES_PASSWORD);
      if (altered) {
        pgPasswordFixed = true;
        fix("re-running db-init and recreating backend to re-establish connections");
        composeUp(["backend-db-init"]);
        composeUp(["--force-recreate", "backend"]);
        recheck.add("backend");
      } else markBroken("could not repair postgres password automatically");
    } else {
      recheck.add("postgres");
      markBroken("postgres rejects docker/.env credentials (run with fix mode to repair)");
    }
  }

  // 4. Container env staleness vs docker/.env
  if (fileEnv.POSTGRES_PASSWORD) {
    const fileHash = sha(fileEnv.POSTGRES_PASSWORD);
    const checks = [
      { service: "postgres", key: "POSTGRES_PASSWORD", hash: fileHash },
      ...["backend", "frontend", "admin"].map((s) => ({
        service: s, key: "DATABASE_URL", hash: fileHash,
      })),
    ];
    const stale = [];
    for (const c of checks) {
      if (!serviceRunning(c.service)) continue;
      const h = containerEnvHash(c.service, c.key);
      if (h && h !== c.hash) stale.push(c.service);
    }
    if (stale.length) {
      stale.forEach((s) => recheck.add(s));
      if (FIX) {
        fix(`recreating containers with stale env: ${stale.join(", ")}`);
        composeUp(["--force-recreate", ...stale]);
        await sleep(5000);
      } else {
        markBroken(`stale container env: ${stale.join(", ")}`);
      }
    }
    ok("container env freshness checked (hash comparison, no secrets printed)");
  }

  // 5. Healthchecks
  for (const s of ["postgres", "redis", "meilisearch", "minio", "backend"]) {
    const row = serviceRunning(s);
    if (!row) continue;
    if (row.health && row.health !== "healthy") {
      recheck.add(s);
      if (FIX) {
        fix(`recreating unhealthy ${s} (state=${row.state}, health=${row.health})`);
        composeUp(["--force-recreate", s]);
        await sleep(8000);
        const again = serviceRunning(s);
        if (again && again.health && again.health !== "healthy") markBroken(`${s} still unhealthy after recreate`);
        else ok(`${s} healthy after recreate`);
      } else {
        markBroken(`${s} unhealthy (health=${row.health})`);
      }
    } else ok(`${s} healthcheck healthy`);
  }

  // 6. HTTP endpoints
  for (const c of HTTP_CHECKS) {
    if (!serviceRunning(c.service)) continue;
    let status = await httpStatus(c.url);
    if (!c.accept.includes(status) && FIX) {
      recheck.add(c.service);
      fix(`recreating ${c.service} (HTTP ${status} from ${c.url})`);
      composeUp(["--force-recreate", c.service]);
      await sleep(10_000);
      status = await httpStatus(c.url);
    }
    if (c.accept.includes(status)) ok(`${c.service} ${c.url} -> HTTP ${status}`);
    else {
      recheck.add(c.service);
      markBroken(`${c.service} ${c.url} -> HTTP ${status}`);
    }
  }

  // 7. Host env drift
  hostEnvInSync = run("node", [path.join(ROOT, "scripts", "sync-dev-env.mjs"), "--check"], { timeout: 30_000 }).code === 0;
  if (!hostEnvInSync) {
    if (FIX) {
      fix("host env drift detected — running scripts/sync-dev-env.mjs");
      run("node", [path.join(ROOT, "scripts", "sync-dev-env.mjs")], { timeout: 30_000 });
      ok("host env files re-synced from docker/.env");
    } else {
      markBroken("host env drift (run: node scripts/sync-dev-env.mjs)");
    }
  } else ok("host env files in sync with docker/.env");

  // ---- Targeted verification for metrics: stack-up for everything, plus a
  // fresh probe only of what a fix touched or that still failed. ----
  const summary = await summaryForMetrics();
  writeMetrics(summary);

  console.log("");
  if (broken || !summary.allOk) {
    fail("STACK UNHEALTHY — see [FAIL] lines above. Escalate per RUNBOOK.md §0.");
    process.exit(1);
  }
  ok("STACK HEALTHY");
}

async function summaryForMetrics() {
  const summary = {
    engineUp: true,
    services: {},
    postgresAuthOk: false,
    hostEnvInSync: false,
  };
  for (const s of SERVICES) {
    const row = serviceRunning(s);
    summary.services[s] = !!row && row.state === "running" && (!row.health || row.health === "healthy");
  }
  for (const s of recheck) {
    if (!summary.services[s]) continue;
    const c = httpCheck(s);
    if (c) summary.services[s] = c.accept.includes(await httpStatus(c.url));
  }
  if (summary.services.postgres) {
    summary.postgresAuthOk = pgPasswordFixed ? pgScramOk() : pgAuthWasOk;
  }
  summary.hostEnvInSync = hostEnvInSync;
  summary.allOk =
    Object.values(summary.services).every(Boolean) &&
    summary.postgresAuthOk &&
    summary.hostEnvInSync;
  return summary;
}

function writeMetrics(summary) {
  if (!METRICS_OUT) return;
  const s = summary ?? { engineUp: false };
  const lines = [];
  const g = (name, help, val) => {
    lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, `${name} ${val}`);
  };
  g("champey_stack_healthy", "1 if the last health check found the whole stack healthy.", s.allOk ? 1 : 0);
  lines.push("# HELP champey_service_healthy Per-service health (running + healthy + endpoint OK).", "# TYPE champey_service_healthy gauge");
  for (const [svc, healthy] of Object.entries(s.services ?? {})) {
    lines.push(`champey_service_healthy{service="${svc}"} ${healthy ? 1 : 0}`);
  }
  g("champey_postgres_auth_ok", "1 if SCRAM auth with docker/.env credentials succeeded.", s.postgresAuthOk ? 1 : 0);
  g("champey_host_env_in_sync", "1 if host app env files match docker/.env.", s.hostEnvInSync ? 1 : 0);
  g("champey_docker_engine_up", "1 if the Docker engine was reachable.", s.engineUp ? 1 : 0);
  g("champey_last_check_timestamp_seconds", "Unix timestamp of the last completed health check.", Math.floor(Date.now() / 1000));
  g("champey_last_check_duration_seconds", "Duration of the last health check run.", ((Date.now() - startedAt) / 1000).toFixed(2));

  const body = lines.join("\n") + "\n";
  try {
    mkdirSync(path.dirname(METRICS_OUT), { recursive: true });
    const tmp = METRICS_OUT + ".tmp";
    writeFileSync(tmp, body);
    renameSync(tmp, METRICS_OUT); // atomic: readers never see partial files
  } catch (e) {
    console.error(`could not write metrics file: ${e.message}`);
  }
}

main();
