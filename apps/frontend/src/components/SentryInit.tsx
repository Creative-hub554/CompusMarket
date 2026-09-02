"use client";

import { useEffect } from "react";

/**
 * Mount once in the root layout to initialise the Sentry browser SDK.
 * Only runs in the browser; a no-op when SENTRY_DSN is unset (dev/CI).
 */
export function SentryInit() {
  useEffect(() => {
    import("../../sentry.client.config").catch(() => {
      /* Sentry optional */
    });
  }, []);
  return null;
}
