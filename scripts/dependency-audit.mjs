#!/usr/bin/env node
/**
 * dependency-audit.mjs — weekly dependency scan (SECURITY-ROTATION.md §1).
 *
 *   node scripts/dependency-audit.mjs                    # scan + report
 *   node scripts/dependency-audit.mjs --fail-on high     # exit 1 threshold
 *
 * Runs `pnpm audit --json` and `pnpm outdated -r --format json`, then writes
 * a dated report under output/dependency-audit/<YYYY-MM-DD>/:
 *   audit.json        raw pnpm audit report
 *   outdated.json     raw pnpm outdated report
 *   summary.txt       human-readable digest (what to patch / review / defer)
 *   history.csv       one row appended per run (severity + drift counters)
 *
 * Exit codes: 0 = nothing at/above threshold; 1 = advisories at/above
 * threshold (default: high); 2 = tool failure (pnpm unresolvable / no JSON).
 * Never prints secret values (none are involved).
 */
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPackageManager, runPnpm } from "./lib/pnpm.mjs";
import { SEV_RANK, advisoriesOf, fixActionsById } from "./lib/audit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const failIdx = argv.indexOf("--fail-on");
const FAIL_ON = argv[failIdx + 1] || "high";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const DAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const STAMP = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const OUT_DIR = path.join(ROOT, "output", "dependency-audit", DAY);
mkdirSync(OUT_DIR, { recursive: true });

const pm = findPackageManager(ROOT);
if (!pm) {
  console.error("[FAIL] could not resolve pnpm (tried: pnpm on PATH, corepack, npm exec pnpm@pin)");
  process.exit(2);
}
console.log(
  `dependency audit ${DAY}/${STAMP} — pnpm runner: ${pm.cmd}${pm.pre.length ? " " + pm.pre.join(" ") : ""} (${pm.version})`
);

// ---- 1. pnpm audit --------------------------------------------------------------
process.stdout.write("running pnpm audit... ");
const audit = runPnpm(pm, ["audit", "--json"], { root: ROOT });
// pnpm exits 1 when advisories exist — that is data, not tool failure.
let auditJson = null;
try {
  auditJson = JSON.parse(audit.stdout);
} catch {
  console.error(
    `[FAIL] pnpm audit produced no parsable JSON (exit ${audit.code})\n${(audit.stderr || "").split("\n").slice(0, 5).join("\n")}`
  );
  process.exit(2);
}
console.log("done");

const advisories = advisoriesOf(auditJson);
const fixById = fixActionsById(auditJson);
const sevCount = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
for (const a of advisories) if (sevCount[a.severity] !== undefined) sevCount[a.severity]++;
const failThreshold = SEV_RANK[FAIL_ON] ?? SEV_RANK.high;

// ---- 2. pnpm outdated --------------------------------------------------------------
process.stdout.write("running pnpm outdated... ");
const outdated = runPnpm(pm, ["outdated", "--recursive", "--format", "json"], { root: ROOT });
let outdatedJson = {};
try {
  outdatedJson = JSON.parse(outdated.stdout || "{}");
} catch {
  outdatedJson = {};
}
console.log("done");

// Classify drift per the doc's grouping: security > patch/minor (monthly batch) > major (quarterly).
const drift = { majors: [], minors: [], patches: [], deprecated: [] };
const bumpOf = (current, latest) => {
  const [cMaj, cMin] = current.split(".");
  const [lMaj, lMin] = latest.split(".");
  if (cMaj !== lMaj) return "majors";
  return cMin === lMin ? "patches" : "minors";
};
for (const [name, info] of Object.entries(outdatedJson)) {
  const current = info.current ?? "";
  const latest = info.latest ?? "";
  if (current && latest && current !== latest) {
    drift[bumpOf(current, latest)].push(name);
  }
  if (info.isDeprecated) drift.deprecated.push(name);
}

// ---- 3. Reports ----------------------------------------------------------------------
writeFileSync(path.join(OUT_DIR, "audit.json"), JSON.stringify(auditJson, null, 2));
writeFileSync(path.join(OUT_DIR, "outdated.json"), JSON.stringify(outdatedJson, null, 2));

const lines = [];
lines.push(`champey dependency audit — ${now.toISOString()}`);
lines.push(`threshold: exit 1 on ${FAIL_ON}+  |  pnpm ${pm.version}`);
lines.push("");
lines.push(
  `Advisories: ${advisories.length} total (critical ${sevCount.critical}, high ${sevCount.high}, moderate ${sevCount.moderate}, low ${sevCount.low})`
);
lines.push("");
if (advisories.length) {
  lines.push("Vulnerabilities (patch via security-patch.mjs):");
  const sorted = [...advisories].sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0));
  for (const a of sorted) {
    const f = fixById[a.id];
    const fix = !f
      ? `no auto-fix (review manually; patched at ${a.patched_versions})`
      : f.action === "install"
        ? `install ${f.module}@${f.target} (MAJOR → quarterly review)`
        : `lockfile update to ${a.patched_versions}`;
    lines.push(`  [${String(a.severity).toUpperCase()}] ${a.module_name} ${a.vulnerable_versions} — ${a.title}`);
    lines.push(`          fix: ${fix}  (${String(a.github_advisory_id || a.npm_advisory_id || "")})`);
  }
  lines.push("");
}
lines.push(
  `Outdated drift: ${drift.majors.length} majors (quarterly review), ${drift.minors.length} minors + ${drift.patches.length} patches (monthly batch), ${drift.deprecated.length} deprecated`
);
if (drift.majors.length)
  lines.push(`  majors: ${drift.majors.slice(0, 12).join(", ")}${drift.majors.length > 12 ? `, +${drift.majors.length - 12} more` : ""}`);
if (drift.deprecated.length) lines.push(`  deprecated: ${drift.deprecated.slice(0, 8).join(", ")}`);
lines.push("");
lines.push(`Weekly scan (this report): ${path.relative(ROOT, OUT_DIR)}`);
lines.push(`Safe patching:            node scripts/security-patch.mjs          (updates + pnpm install + build gate)`);
lines.push(`Dry run first:            node scripts/security-patch.mjs --dry-run`);
const summary = lines.join("\n") + "\n";
writeFileSync(path.join(OUT_DIR, "summary.txt"), summary);
console.log(summary);

// history.csv — one row per run
const histPath = path.join(ROOT, "output", "dependency-audit", "history.csv");
if (!existsSync(histPath)) {
  writeFileSync(histPath, "date,advisories,critical,high,moderate,low,majors,minors,patches,deprecated\n");
}
appendFileSync(
  histPath,
  `${DAY}T${STAMP},${advisories.length},${sevCount.critical},${sevCount.high},${sevCount.moderate},${sevCount.low},${drift.majors.length},${drift.minors.length},${drift.patches.length},${drift.deprecated.length}\n`
);
console.log(`history: ${path.relative(ROOT, histPath)}`);

const aboveThreshold = advisories.some((a) => (SEV_RANK[a.severity] ?? 0) >= failThreshold);
console.log(
  aboveThreshold
    ? `\n[FAIL] advisories at/above "${FAIL_ON}" present — run node scripts/security-patch.mjs`
    : `\n[ok] nothing at/above "${FAIL_ON}"`
);
process.exit(aboveThreshold ? 1 : 0);
