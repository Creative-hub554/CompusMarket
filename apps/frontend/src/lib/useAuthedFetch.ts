"use client";

import { useCallback, useRef } from "react";
import { useSession } from "@/lib/session-client";

/**
 * Fetch wrapper that attaches the session access token and retries once with a
 * freshly minted token when the backend rejects an expired one (401).
 */
export function useAuthedFetch() {
  const { data: session, update } = useSession();
  const accessToken = session?.accessToken;
  const retried = useRef(false);

  return useCallback(
    async (path: string, init?: RequestInit) => {
      const doFetch = (token?: string) => {
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(path, { ...init, headers });
      };

      let res = await doFetch(accessToken);

      // Token may have expired mid-session: force-refresh it once and retry.
      if (res.status === 401 && !retried.current) {
        retried.current = true;
        try {
          // update() re-runs the session callbacks and returns fresh session
          // data including a newly minted access token.
          const fresh = (await update()) as typeof session | null;
          res = await doFetch(fresh?.accessToken);
        } finally {
          retried.current = false;
        }
      }

      return res;
    },
    [accessToken, update]
  );
}
