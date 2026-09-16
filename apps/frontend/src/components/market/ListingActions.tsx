"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ReportButton } from "@/components/social/ReportButton";

export function ListingActions({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: name, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Listing actions"
    >
      <button
        type="button"
        onClick={share}
        className="btn-ghost inline-flex min-h-11 items-center gap-2"
      >
        <Share2 size={17} aria-hidden />
        {copied ? "Link copied" : "Share listing"}
      </button>
      <ReportButton targetType="PRODUCT" targetId={productId} />
    </div>
  );
}
