"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useTranslations } from "next-intl";
import { ThumbsUp } from "lucide-react";

export function FollowPageButton({
  pageId,
  initialFollowing,
  size = "md",
  onChange,
}: {
  pageId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean, followerCount: number) => void;
}) {
  const t = useTranslations("pages");
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const data = await apiFetch<{ following: boolean; followerCount: number }>(
        `/api/pages/${pageId}/follow`,
        { method: following ? "DELETE" : "POST" }
      );
      setFollowing(data.following);
      onChange?.(data.following, data.followerCount);
    } catch {
      /* button state stays as-is on failure */
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`${following ? "btn-ghost" : "btn-primary"} inline-flex items-center gap-1.5 ${
        size === "sm" ? "!py-1.5 text-sm" : ""
      }`}
      aria-pressed={following}
    >
      <ThumbsUp size={size === "sm" ? 13 : 15} />
      {following ? t("following") : t("follow")}
    </button>
  );
}
