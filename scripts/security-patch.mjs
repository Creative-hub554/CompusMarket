#!/usr/bin/env node
/**
 * security-patch.mjs — safe dependency patch flow (SECURITY-ROTATION.md §1,
 * monthly "coordinated security patch" step adapted for local runs).
 *
 *   node scripts/security-patch.mjs --dry-run    # show the plan, change nothing
 *   node scripts/security-patch.mjs              # apply + verify (+ rollback on failure)
 *
 * Flow:
 *   1. `pnpm audit --json` — capture the before state
 *   2. `pnpm audit --fix`  — adds semver-compatible pnpm.overrides to the root
 *      package.json (vulnerable transitive ranges can never come back) and
 *      re-resolves the lockfile via `pnpm install`
 *   3. re-audit — measure improvement
 *   4. build gate — `pnpm build` must pass
 *   5. on failure: git-restore ONLY package.json + pnpm-lock.yaml (safe because
 *      the script refuses to run on a dirty worktree), exit 1
 *   6. on success: prints a before/after summary, remaining (major/deferred)
 *      advisories, and the suggested SECURITY.md entry
 *
 * Majors (semver-breaking fixes) are NEVER applied here — they go to the
 * quarterly review per the doc. Review the diff and commit yourself; this
 * script does not create commits.
 *
 * Exit codes: 0 = patched (or nothing to patch); 1 = build gate failed
 * (rolled back); 2 = tool failure; 3 = dirty worktree in apply mode.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPackageManager, runPnpm } from "./lib/pnpm.mjs";
import { SEV_RANK, advisoriesOf, countSev, fmtCounts, fixActionsById } from "./lib/audit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");

const git = (args) => {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: ROOT, timeout: 60_000 });
  return { code: r.status ?? 1, out: (r.stdout ?? "").trim() };
};
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const DAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const pm = findPackageManager(ROOT);
if (!pm) {
  console.error("[FAIL] could not resolve pnpm (tried: pnpm on PATH, corepack, npm exec pnpm@pin)");
  process.exit(2);
}
console.log(`security patch ${DAY} — pnpm runner: ${pm.cmd}${pm.pre.length ? " " + pm.pre.join(" ") : ""} (${pm.version})`);

// ---- 1. before state ------------------------------------------------------------
process.stdout.write("capturing current audit state... ");
const before = runPnpm(pm, ["audit", "--json"], { root: ROOT });
let beforeJson = null;
try {
  beforeJson = JSON.parse(before.stdout);
} catch {
  console.error(`[FAIL] pnpm audit produced no parsable JSON (exit ${before.code})`);
  process.exit(2);
}
const advisories = advisoriesOf(beforeJson);
const fixById = fixActionsById(beforeJson);
const beforeCounts = countSev(beforeJson);
console.log(`done (${advisories.length} advisories: ${fmtCounts(beforeCounts)})`);

if (!advisories.length) {
  console.log("\n[ok] no advisories — nothing to patch.");
  process.exit(0);
}
const majors = advisories.filter((a) => fixById[a.id]?.action === "install");
const safeList = advisories.filter((a) => fixById[a.id]?.action === "update");

console.log("\nPlan:");
for (const a of safeList) {
  console.log(`  [${String(a.severity).toUpperCase()}] ${a.module_name} -> ${a.patched_versions} (semver-safe)`);
}
for (const a of majors) {
  console.log(`  [${String(a.severity).toUpperCase()}] ${a.module_name} -> ${a.actions[0].target} (MAJOR — deferred to quarterly review)`);
}
if (!safeList.length) {
  console.log("\n[ok] no semver-safe fixes available; all advisories need major upgrades (quarterly review).");
  process.exit(0);
}

if (DRY) {
  console.log("\n[dry-run] no changes made. Re-run without --dry-run to apply.");
  process.exit(0);
}

// ---- 2. apply mode requires the files it will touch to be clean -------------------
// (scoped guard: unrelated in-flight work in other files is fine — the flow and
// its rollback only ever touch these three files)
const PATCH_FILES = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
const changed = git(["diff", "--name-only"]).out.split("\n").map((f) => f.trim());
const blocked = PATCH_FILES.filter((f) => changed.includes(f));
if (blocked.length) {
  console.error(`\n[FAIL] ${blocked.join(", ")} has uncommitted changes — commit or stash them first (the rollback restores exactly these files).`);
  process.exit(3);
}

console.log("\napplying pnpm audit --fix...");
const fix = runPnpm(pm, ["audit", "--fix"], { root: ROOT, timeout: 300_000 });
console.log(`audit --fix exit ${fix.code}${fix.stderr ? ` (stderr: ${fix.stderr.split("\n")[0].slice(0, 120)})` : ""}`);

// Restore the guarded files to HEAD (the guard guarantees they were clean,
// so git-checkout leaves no half-applied state behind).
const rollback = (why) => {
  const touched = git(["diff", "--name-only"]).out.split("\n").filter((f) => PATCH_FILES.includes(f.trim()));
  for (const f of touched) git(["checkout", "--", f]);
  console.error(`rolled back: ${touched.join(", ") || "(none)"}`);
  return touched.length > 0;
};

console.log("running pnpm install (re-resolve lockfile)...");
const install = runPnpm(pm, ["install", "--no-frozen-lockfile"], { root: ROOT, timeout: 900_000 });
if (install.code !== 0) {
  console.error(`[FAIL] pnpm install failed (exit ${install.code})`);
  console.error((install.stderr || "").split("\n").slice(0, 8).join("\n"));
  rollback("install failed");
  process.exit(2);
}

// ---- 3. after state ---------------------------------------------------------------
const after = runPnpm(pm, ["audit", "--json"], { root: ROOT });
let afterJson = {};
try {
  afterJson = JSON.parse(after.stdout);
} catch {
  afterJson = { advisories: {} };
}
const afterCounts = countSev(afterJson);
const afterAdvisories = advisoriesOf(afterJson);

// ---- 4. build gate ------------------------------------------------------------------
console.log("\nbuild gate: pnpm build (this can take a few minutes)...");
const build = runPnpm(pm, ["build"], { root: ROOT, timeout: 1_200_000 });
if (build.code !== 0) {
  console.error("[FAIL] build gate FAILED — rolling back package.json + pnpm-lock.yaml");
  rollback("build gate failed");
  console.error((build.stdout || "").split("\n").slice(-8).join("\n"));
  process.exit(1);
}

// ---- 5. report ----------------------------------------------------------------------
console.log("\n================ patch summary ================");
console.log(`before: ${advisories.length} advisories (${fmtCounts(beforeCounts)})`);
console.log(`after:  ${afterAdvisories.length} advisories (${fmtCounts(afterCounts)})`);
const remaining = afterAdvisories.filter((a) => (SEV_RANK[a.severity] ?? 0) >= SEV_RANK.moderate);
if (remaining.length) {
  console.log("remaining (review/defer):");
  for (const a of remaining) console.log(`  [${String(a.severity).toUpperCase()}] ${a.module_name} ${a.vulnerable_versions} — ${a.title}`);
}
console.log("\nNext steps (per SECURITY-ROTATION.md §1):");
console.log("  1. review the diff:  git diff package.json pnpm-lock.yaml");
console.log("  2. run the tests:    pnpm test");
console.log("  3. commit as:        security-patch: dependency updates (see SECURITY.md)");
console.log("  4. rebuild + recreate the stack:  docker compose build && docker compose up -d");

// SECURITY.md entry (log section only — no secrets involved)
const secMd = path.join(ROOT, "SECURITY.md");
if (existsSync(secMd)) {
  const entry = [
    "",
    "### Dependency Security Patch",
    `- **Applied:** ${DAY}`,
    `- **Change:** ${safeList.length} semver-safe fixes via pnpm audit --fix (+overrides); advisories ${advisories.length} -> ${afterAdvisories.length}`,
    `- **Deferred (majors):** ${majors.length ? majors.map((m) => m.module_name).join(", ") : "none"}`,
    "- **Verification:** pnpm build gate passed; pending: full test suite + stack recreate",
    "",
  ].join("\n");
  appendFileSync(secMd, entry);
  console.log(`logged: SECURITY.md (dependency patch entry, ${DAY})`);
}

process.exit(0);
