"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Conversation = {
  id: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string | null;
  buyer: { id: string; name: string | null; email: string };
  seller: {
    id: string;
    user: { id: string; name: string | null; email: string };
  };
  messages: { content: string }[];
  _count: { messages: number };
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-gray-600 mb-4">
          Please sign in to view your messages.
        </p>
        <Link
          href="/login"
          className="text-slate-900 font-medium hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : conversations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other =
              conv.buyerId === session.user?.id ? conv.seller.user : conv.buyer;
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full text-left border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{other.name || other.email}</p>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conv.messages[0]?.content || "No messages yet"}
                    </p>
                  </div>
                  {conv._count.messages > 0 && (
                    <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1">
                      {conv._count.messages}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
