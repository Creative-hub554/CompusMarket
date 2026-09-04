"use client";


import { toast } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";

export function ChatWithSellerButton({
  sellerId,
  productId,
}: {
  sellerId: string;
  productId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChat() {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, productId }),
      });
      if (!res.ok) throw new Error("Failed");
      const thread = await res.json();
      router.push(`/messages/${thread.id}`);
    } catch {
      toast.error("Failed to start conversation");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleChat}
      disabled={loading}
      className="w-full rounded-lg border border-khmer-blue text-khmer-blue py-3 font-medium hover:bg-khmer-blue hover:text-white disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-95"
    >
      {loading ? "Starting..." : "Chat with Seller"}
    </button>
  );
}
