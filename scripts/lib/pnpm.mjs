/**
 * lib/pnpm.mjs — resolve and run pnpm for the maintenance scripts.
 *
 * pnpm is not installed globally on this machine, so the resolver tries, in
 * order:
 *   1. `pnpm` on PATH
 *   2. `corepack pnpm` (uses the repo's packageManager field)
 *   3. pinned ephemeral `npm exec --yes pnpm@<packageManager version>` —
 *      no global install, always the version the repo pins
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export function findPackageManager(root = process.cwd()) {
  let packageManager = "pnpm@9.0.0";
  try {
    packageManager = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).packageManager || packageManager;
  } catch {
    /* fall back to the pin below */
  }
  const pinned = packageManager.replace(/^pnpm@/, "");

  const candidates = [
    { cmd: "pnpm", pre: [] },
    { cmd: "corepack", pre: ["pnpm"] },
    { cmd: "npm", pre: ["exec", "--yes", `pnpm@${pinned}`, "--"] },
  ];
  for (const c of candidates) {
    const r = spawnSync(c.cmd, [...c.pre, "--version"], {
      encoding: "utf8",
      cwd: root,
      timeout: c.cmd === "npm" ? 300_000 : 120_000,
      shell: process.platform === "win32",
    });
    const out = (r.stdout ?? "").trim();
    if (r.status === 0 && /^\d+\.\d+/.test(out)) return { ...c, version: out, packageManager };
  }
  return null;
}

/** Run a pnpm subcommand through the resolved runner. Never prints secrets (none involved). */
export function runPnpm(pm, args, { timeout = 900_000, root = process.cwd() } = {}) {
  const r = spawnSync(pm.cmd, [...pm.pre, ...args], {
    encoding: "utf8",
    cwd: root,
    timeout,
    shell: process.platform === "win32",
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
