"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export type NavDirection = "nav-forward" | "nav-back";

type StartViewTransitionFn = {
  (update: () => unknown): unknown;
  (options: { update: () => unknown; types?: string[] }): unknown;
};

function getStartViewTransition(): StartViewTransitionFn | undefined {
  if (typeof document === "undefined") return undefined;
  const sdt = (document as Document & {
    startViewTransition?: StartViewTransitionFn;
  }).startViewTransition;
  return typeof sdt === "function" ? sdt : undefined;
}

/**
 * Client-side navigation wrapped in a native View Transition so the browser
 * slides/morphs between pages. Uses the raw `next/navigation` router because
 * next-intl's `useRouter` wrapper drops the promise that
 * `startViewTransition` must await before snapshotting the new state.
 *
 * Falls back to a plain push when the API is unavailable. The object form
 * (with transition types) is only used for directional navigation and only
 * where the browser supports it; anything unexpected degrades to a plain push.
 */
export function useTransitionNavigation() {
  const router = useRouter();
  const locale = useLocale();

  return useCallback(
    (href: string, direction?: NavDirection) => {
      const localized = `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
      const startViewTransition = getStartViewTransition();

      if (!startViewTransition) {
        router.push(localized);
        return;
      }

      const update = () => router.push(localized);
      try {
        if (direction) {
          startViewTransition({ update, types: [direction] });
        } else {
          startViewTransition(update);
        }
      } catch {
        router.push(localized);
      }
    },
    [router, locale]
  );
}