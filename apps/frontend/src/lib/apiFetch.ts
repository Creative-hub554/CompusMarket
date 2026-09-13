import { getApiBase } from "@/lib/apiBase";
import { toast } from "@/components/ui/toast";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

const cache = new Map<string, { data: unknown; expiry: number }>();

/** Error thrown for non-2xx responses, carrying the HTTP status + response body. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Distinguishing wrapper for request-level failures that are not API responses
 * (network errors, timeouts, aborted requests). Callers that want to surface
 * something to the user can branch on this type before falling back to the
 * generic ApiError path.
 */
export class RequestError extends Error {
  constructor(
    message: string,
    /** True when the failure was a deliberate timeout rather than a network hiccup. */
    public readonly timedOut: boolean = false,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

/** Shared error handler for client-side apiFetch calls.
 *
 * Strategy:
 * - Read failures (GET) are logged only — callers already have fallbacks.
 * - Mutation failures (POST/PATCH/DELETE) surface a toast by default so users
 *   get feedback when posting, reacting, following, etc. fails.
 * - 401 surfaces a session-expired message and returns `{ sessionExpired: true }`
 *   so callers can redirect to sign-in.
 * - The caller can still opt out by catching and handling themselves.
 *
 * Retry:
 * - When a `retryFn` is provided and the first failure is a 5xx, the
 *   operation is retried once after 800ms backoff. If the retry succeeds,
 *   `{ sessionExpired: false, retryResult }` is returned so the caller can
 *   proceed with the success path. If the retry also fails, the normal toast
 *   is shown.
 * - Non-5xx failures (4xx, network, timeout) are never auto-retried.
 */
export async function handleApiError(
  err: unknown,
  /** The human-readable action that failed (e.g. "post your update", "react to the post"). */
  action: string,
  /** When true, treat the failure as a read (no toast) even for mutations. */
  readLike = false,
  /** When true and the failure is a 5xx *without* a retryFn, wait 800ms before
   * toasting (debounce rapid repeated failures). Ignored when retryFn is set. */
  retryOnServerFailure = !readLike,
  /** The operation to retry once on a transient 5xx. When provided and the
   * first failure is a 5xx, this runs after backoff; its resolved value is
   * returned on success, and a second failure falls through to the toast. */
  retryFn?: () => Promise<unknown>,
): Promise<{ sessionExpired: boolean; retryResult?: unknown }> {
  const apiError = err instanceof ApiError ? err : null;
  const requestError = err instanceof RequestError ? err : null;

  // Session expiry: always surface, regardless of readLike.
  if (apiError && apiError.status === 401) {
    toast.error(`Your session expired. Please sign in again to ${action}.`);
    return { sessionExpired: true };
  }

  // Auto-retry transient server failures once via the caller's retry function.
  if (apiError && apiError.status >= 500 && retryFn) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      const result = await retryFn();
      return { sessionExpired: false, retryResult: result };
    } catch (retryErr) {
      const retryApiError = retryErr instanceof ApiError ? retryErr : null;
      if (retryApiError && retryApiError.status >= 500) {
        // Retry also hit a 5xx — fall through to the server-error toast below.
      } else {
        // Retry failed with a non-5xx or network error — surface that instead.
        return handleApiError(retryErr, action, readLike, false);
      }
    }
  }

  if (retryOnServerFailure && apiError && apiError.status >= 500 && !retryFn) {
    // No retryFn: just debounce the toast for rapid repeated 5xx.
    await new Promise((r) => setTimeout(r, 800));
  }

  if (readLike) {
    // Reads with fallbacks: be quiet — the caller will show empty state.
    if (requestError && requestError.timedOut) {
      console.warn(`[api] ${action} timed out`);
    } else if (apiError) {
      console.warn(`[api] ${action} failed: ${apiError.status} ${apiError.message}`);
    }
    return { sessionExpired: false };
  }

  // Mutations: give the user something.
  if (apiError) {
    if (apiError.status === 404) {
      toast.error(`That ${action} isn't available anymore.`);
    } else if (apiError.status === 403) {
      toast.error(`You don't have permission to ${action}.`);
    } else if (apiError.status === 409) {
      toast.error(`That ${action} was already done.`);
    } else if (apiError.status >= 500) {
      toast.error(`Server error while ${action}. Please try again.`);
    } else {
      toast.error(`Couldn't ${action}. Please try again.`);
    }
  } else if (requestError) {
    if (requestError.timedOut) {
      toast.error(`Took too long to ${action}. Check your connection and try again.`);
    } else {
      toast.error(`Couldn't ${action}. Check your connection and try again.`);
    }
  } else {
    toast.error(`Couldn't ${action}.`);
  }

  return { sessionExpired: false };
}


export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Request body. Plain objects are JSON-stringified automatically. */
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  /** Cache GET responses for this many ms (keyed by path + auth). */
  cacheTtlMs?: number;
  /** Bearer token to attach. Only needed for direct-to-backend calls — the
   * same-origin `/api/*` proxy re-signs the JWT from the session cookie. */
  token?: string;
  /** Return the raw Response instead of parsed JSON. */
  raw?: boolean;
}

/**
 * Resolve a path to a full URL:
 * - absolute http(s) URLs pass through (server-side calls to the backend)
 * - `/api/...` stays same-origin (the Next.js auth proxy)
 * - anything else is treated as a backend route and gets `getApiBase()` prefixed
 */
function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path === "/api" || path.startsWith("/api/")) return path;
  return `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const msg = typeof p.error === "string" ? p.error : typeof p.message === "string" ? p.message : undefined;
    if (msg) return msg;
  }
  return `API error: ${status}`;
}

/**
 * Single fetch wrapper for the whole app. Handles JSON (de)serialization,
 * timeouts, retries with backoff (network errors / 5xx only), optional GET
 * caching, and normalized errors. Replaces the previous parallel layers
 * (`fetchApi` in services/api.ts, `useAuthedFetch`, and ad-hoc `fetch` calls).
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES, cacheTtlMs, token, raw, headers, body, ...rest } = options;
  const method = rest.method ?? "GET";
  const url = resolveUrl(path);

  const h = new Headers(headers);
  if (token) h.set("Authorization", `Bearer ${token}`);

  let fetchBody: BodyInit | undefined = body as BodyInit | undefined;
  if (
    body !== undefined &&
    typeof body !== "string" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    fetchBody = JSON.stringify(body);
    if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  }

  const cacheKey = () => `${h.get("Authorization") ?? ""}:${path}`;

  if (method === "GET" && cacheTtlMs) {
    const entry = cache.get(cacheKey());
    if (entry && Date.now() < entry.expiry) return entry.data as T;
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        method,
        headers: h,
        body: fetchBody,
        signal: controller.signal,
      });

      if (!res.ok) {
        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {
          /* empty or non-JSON error body */
        }
        lastError = new ApiError(res.status, extractErrorMessage(payload, res.status), payload ?? undefined);
        if (res.status >= 500) throw lastError; // retryable
        break;
      }

      if (raw) return res as unknown as T;

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = undefined; // 204 / empty body
      }
      if (method === "GET" && cacheTtlMs) {
        cache.set(cacheKey(), { data, expiry: Date.now() + cacheTtlMs });
      }
      return data as T;
    } catch (err) {
      const isAbort =
        (typeof DOMException !== "undefined" &&
          err instanceof DOMException &&
          err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError");
      if (isAbort) {
        lastError = new RequestError(`Request timed out after ${timeoutMs}ms`, true);
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      const status = lastError instanceof ApiError ? lastError.status : undefined;
      if (status !== undefined && status < 500) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2 ** attempt * 300));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}