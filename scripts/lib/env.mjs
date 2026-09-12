/**
 * lib/env.mjs — one docker/.env parser for the maintenance scripts.
 *
 * Canonical secrets live in docker/.env (repo root). Never print values.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of the repo root (the directory containing scripts/). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** Parse an env-style file into a `{ KEY: value }` object ({} if missing). */
export function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(LINE);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** docker/.env as `{ KEY: value }`. */
export function dockerEnv() {
  return parseEnvFile(resolve(ROOT, "docker", ".env"));
}
