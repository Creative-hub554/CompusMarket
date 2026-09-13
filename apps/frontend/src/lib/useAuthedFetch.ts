"use client";

import { useCallback, useRef } from "react";
import { useSession } from "@/lib/session-client";
import { apiFetch, ApiError, RequestError, type ApiFetchOptions } from "@/lib/apiFetch";

/**
 * Fetch wrapper that attaches the session access token and retries once with a
 * freshly minted token when the backend rejects an expired one (401).
 *
 * Unlike the old version it returns the parsed JSON body directly (like
 * `apiFetch`), so callers don't need to `.json()` the response themselves.
 */
export function useAuthedFetch() {
  const { data: session, update } = useSession();
  const accessToken = session?.accessToken;
  const retried = useRef(false);

  return useCallback(
    async <T = unknown>(path: string, init?: ApiFetchOptions): Promise<T> => {
      try {
        return await apiFetch<T>(path, { ...init, token: accessToken });
      } catch (err) {
        // Token may have expired mid-session: force-refresh it once and retry.
        const is401 =
          (err instanceof ApiError && err.status === 401) ||
          (err instanceof RequestError && err.message.toLowerCase().includes("timed out"));
        if (is401 && !retried.current) {
          retried.current = true;
          try {
            // update() re-runs the session callbacks and returns fresh session
            // data including a newly minted access token.
            const fresh = (await update()) as typeof session | null;
            return await apiFetch<T>(path, { ...init, token: fresh?.accessToken });
          } finally {
            retried.current = false;
          }
        }
        throw err;
      }
    },
    [accessToken, update]
  );
}