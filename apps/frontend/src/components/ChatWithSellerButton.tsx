"use client";


import { toast } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { apiFetch, handleApiError } from "@/lib/apiFetch";
import { useHandleApiError } from "@/lib/useHandleApiError";

export function ChatWithSellerButton({
  sellerId,
  productId,
}: {
  sellerId: string;
  productId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const _handleApiError = useHandleApiError();
  const [loading, setLoading] = useState(false);

  async function handleChat() {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const thread = await apiFetch<{ id: string }>("/api/threads", {
        method: "POST",
        body: { sellerId, productId },
      });
      router.push(`/messages/${thread.id}`);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "start a conversation with the seller", false, true, () =>
        apiFetch<{ id: string }>("/api/threads", {
          method: "POST",
          body: { sellerId, productId },
        }),
      );
      if (retryResult) {
        router.push(`/messages/${(retryResult as { id: string }).id}`);
      }
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
