"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { handleApiError } from "./apiFetch";

/**
 * Wrapper around handleApiError that redirects to /login when a 401
 * surfaces (session expired). The returnUrl lets the login page send the
 * user back to where they were after signing in.
 */
export function useHandleApiError() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    async (
      err: unknown,
      action: string,
      readLike = false,
      retryOnServerFailure = !readLike,
      retryFn?: () => Promise<unknown>,
    ) => {
      const { sessionExpired, retryResult } = await handleApiError(
        err,
        action,
        readLike,
        retryOnServerFailure,
        retryFn,
      );
      if (sessionExpired) {
        router.push(
          `/login?returnUrl=${encodeURIComponent(pathname + window.location.search)}`,
        );
      }
      return { sessionExpired, retryResult };
    },
    [router, pathname],
  );
}
