/**
 * Backend base URL resolution for server-side calls from the admin app.
 * `INTERNAL_API_URL` is the server-to-server origin (the docker service name
 * inside a compose network). When unset we fall back to `NEXT_PUBLIC_API_URL`
 * (browser-facing, right for local dev) and then to the local default. Like
 * the frontend helper, the value may or may not carry the `/api` suffix — never
 * build URLs against the raw string.
 */

const DEFAULT_ORIGIN = "http://localhost:4000";

/** e.g. `http://localhost:4000` — no path. */
export function getBackendOrigin(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_ORIGIN
  ).replace(/\/+$/, "");
}

/** e.g. `http://localhost:4000/api` — the NestJS global prefix included. */
export function getApiBase(): string {
  const origin = getBackendOrigin();
  return origin.endsWith("/api") ? origin : `${origin}/api`;
}
