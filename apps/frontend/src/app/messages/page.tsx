"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo, useAuthSocket } from "@/lib/social";

type Thread = {
  id: string;
  participants: { id: string; name: string | null; username: string | null; image: string | null }[];
  product: { id: string; name: string; price: unknown; images: unknown } | null;
  lastMessage: { id: string; content: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const socketRef = useAuthSocket(session?.user?.id);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/threads")
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("presenceSnapshot");
    socket.on("presenceSnapshot", ({ online: ids }: { online: string[] }) =>
      setOnline(new Set(ids))
    );
    socket.on("presence", ({ userId, online: isOnline }: { userId: string; online: boolean }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
    socket.on("newMessage", (msg: { id: string; threadId: string; senderId: string; content: string; createdAt: string }) => {
      if (!session || msg.senderId === session.user?.id) return;
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.id === msg.threadId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const [thread] = updated.splice(idx, 1);
        updated.unshift({
          ...thread,
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          unreadCount: thread.unreadCount + 1,
        });
        return updated;
      });
    });

    return () => {
      socket.off("presenceSnapshot");
      socket.off("presence");
      socket.off("newMessage");
    };
  }, [socketRef.current, session?.user?.id]);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-gray-600 mb-4">Please sign in to view your messages.</p>
        <Link href="/login" className="text-slate-900 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-2">No conversations yet.</p>
          <p className="text-sm">
            Start one from a{" "}
            <Link href="/market" className="text-indigo-600 hover:underline">
              seller&apos;s shop
            </Link>{" "}
            or say hi on the{" "}
            <Link href="/feed" className="text-indigo-600 hover:underline">
              feed
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const other = thread.participants[0];
            const isOnline = other ? online.has(other.id) : false;
            return (
              <button
                key={thread.id}
                onClick={() => router.push(`/messages/${thread.id}`)}
                className="w-full text-left rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-indigo-200 transition-all flex items-center gap-3"
              >
                <Avatar user={other ?? {}} size={48} online={isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">
                      {other?.name || other?.username || "Unknown"}
                    </p>
                    {thread.lastMessageAt && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(thread.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {thread.product && (
                    <span className="inline-block mt-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 truncate max-w-full">
                      {thread.product.name}
                    </span>
                  )}
                  <p className={`text-sm truncate mt-1 ${thread.unreadCount > 0 ? "font-semibold text-slate-900" : "text-gray-500"}`}>
                    {thread.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center shrink-0">
                    {thread.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
