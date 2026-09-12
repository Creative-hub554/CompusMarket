"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, handleApiError } from "@/lib/apiFetch";
import { useHandleApiError } from "@/lib/useHandleApiError";

export function FollowButton({
  userId,
  initialFollowing = false,
  initialRequested = false,
  onChange,
  size = "md",
}: {
  userId: string;
  /** Already an accepted follower. */
  initialFollowing?: boolean;
  /** Outstanding follow request on a private account. */
  initialRequested?: boolean;
  onChange?: (state: { following: boolean; requested: boolean }) => void;
  size?: "sm" | "md";
}) {
  const t = useTranslations("profile");
  const _handleApiError = useHandleApiError();
  const [following, setFollowing] = useState(initialFollowing);
  const [requested, setRequested] = useState(initialRequested);
  const [busy, setBusy] = useState(false);

  // Following or requested both cancel via DELETE: an accepted edge is removed,
  // an outstanding request is withdrawn.
  const active = following || requested;

  async function toggle() {
    setBusy(true);
    try {
      const body = await apiFetch<{ state?: string } | null>(`/api/users/${userId}/follow`, {
        method: active ? "DELETE" : "POST",
      });
      if (active) {
        setFollowing(false);
        setRequested(false);
        onChange?.({ following: false, requested: false });
      } else {
        const next = body?.state === "requested";
        setFollowing(!next);
        setRequested(next);
        onChange?.({ following: !next, requested: next });
      }
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "follow this user", false, true, () =>
        apiFetch<{ state?: string } | null>(`/api/users/${userId}/follow`, {
          method: active ? "DELETE" : "POST",
        }),
      );
      if (retryResult !== null) {
        const body = retryResult as { state?: string } | null;
        if (active) {
          setFollowing(false);
          setRequested(false);
          onChange?.({ following: false, requested: false });
        } else {
          const next = body?.state === "requested";
          setFollowing(!next);
          setRequested(next);
          onChange?.({ following: !next, requested: next });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50 ${
        size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-5 py-2"
      } ${
        following
          ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
          : "bg-gold-600 text-white hover:bg-gold-700"
      } ${requested ? "opacity-80" : ""}`}
    >
      {following ? t("following") : requested ? t("requested") : t("follow")}
    </button>
  );
}
