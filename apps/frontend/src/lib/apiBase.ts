/**
 * Backend base URL resolution. `NEXT_PUBLIC_API_URL` may be configured with or
 * without the `/api` suffix (both conventions appear across the repo and in
 * the docker stacks), so never build URLs against the raw value.
 */

const DEFAULT_ORIGIN = "http://localhost:4000";

/** e.g. `http://localhost:4000` — no path. */
export function getBackendOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_ORIGIN).replace(/\/+$/, "");
}

/** e.g. `http://localhost:4000/api` — the NestJS global prefix included. */
export function getApiBase(): string {
  const origin = getBackendOrigin();
  return origin.endsWith("/api") ? origin : `${origin}/api`;
}