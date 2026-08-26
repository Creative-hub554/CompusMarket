"use client";

import { useState } from "react";

export function FollowButton({
  userId,
  initialFollowing,
  onChange,
  size = "md",
}: {
  userId: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const method = following ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      const next = !following;
      setFollowing(next);
      onChange?.(next);
    }
    setBusy(false);
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
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
