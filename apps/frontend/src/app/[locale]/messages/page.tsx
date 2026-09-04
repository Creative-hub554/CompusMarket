"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";
import { Users, Bot, UserPlus, X } from "lucide-react";
import { timeAgo, useAuthSocket } from "@/lib/social";

type Thread = {
  id: string;
  participants: { id: string; name: string | null; username: string | null; image: string | null }[];
  product: { id: string; name: string; price: unknown; images: unknown } | null;
  group: { id: string; name: string } | null;
  lastMessage: { id: string; content: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type MatchedUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  matched: string[];
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [botId, setBotId] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [contactList, setContactList] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const socketRef = useAuthSocket(session?.user?.id);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/threads")
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data) ? data : []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
    fetch("/api/threads/bot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBotId(data?.id ?? null))
      .catch(() => {});
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAiReady(!!data?.available))
      .catch(() => {});
  }, [session?.user?.id]);

  const openBotChat = () => {
    if (!botId) return;
    fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: botId }),
    })
      .then((r) => r.json())
      .then(({ id }) => router.push(`/messages/${id}`))
      .catch(() => {});
  };

  const syncContacts = () => {
    const list = contactList
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    setSyncing(true);
    fetch("/api/threads/contacts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: list }),
    })
      .then((r) => r.json())
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .catch(() => setMatches([]))
      .finally(() => setSyncing(false));
  };

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
        <p className="text-gray-600 dark:text-gray-300 mb-4">Please sign in to view your messages.</p>
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button
          onClick={() => {
            setSyncOpen((v) => !v);
            setMatches([]);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 text-gold-700 dark:text-gold-light px-3 py-1.5 text-xs font-semibold hover:bg-gold-500/10 transition-colors"
        >
          <UserPlus size={14} />
          Sync contacts
        </button>
      </div>

      {syncOpen && (
        <div className="section-box p-4 mb-5 animate-slide-down">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Find people you know</p>
            <button onClick={() => setSyncOpen(false)} className="text-gray-400 hover:text-slate-600 dark:hover:text-slate-300" title="Close">
              <X size={15} />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Paste emails or usernames (one per line) — we&apos;ll match them against Champey accounts.
          </p>
          <textarea
            value={contactList}
            onChange={(e) => setContactList(e.target.value)}
            rows={3}
            placeholder={"friend@example.com\nsokha_99"}
            className="input-field resize-none font-mono text-xs"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={syncContacts}
              disabled={syncing || !contactList.trim()}
              className="btn-primary !py-1.5 text-xs"
            >
              {syncing ? "Matching…" : "Match contacts"}
            </button>
            {matches.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{matches.length} found on Champey</span>
            )}
          </div>
          {matches.length > 0 && (
            <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
              {matches.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2">
                  <Avatar user={u} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{u.name || u.username}</span>
                    <span className="block text-[11px] text-gray-400 truncate">
                      {u.username ? `@${u.username}` : ""} · matched {u.matched.join(", ")}
                    </span>
                  </span>
                  <button
                    onClick={() =>
                      fetch("/api/threads", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: u.id }),
                      })
                        .then((r) => r.json())
                        .then(({ id }) => router.push(`/messages/${id}`))
                        .catch(() => {})
                    }
                    className="rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition"
                  >
                    Chat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Built-in assistant, Telegram-style */}
      {botId && (
        <button
          onClick={openBotChat}
          className="w-full text-left rounded-xl border border-gold-500/40 bg-gradient-to-r from-gold-500/10 to-transparent p-4 hover:border-gold-500/70 transition-all flex items-center gap-3 mb-3"
        >
          <span className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-[0_6px_18px_-6px_rgba(212,160,39,0.6)]">
            <Bot size={22} className="text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold">
              Champey Bot
              {aiReady && (
                <span className="ml-2 align-middle rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-700 dark:text-gold-light">
                  AI AGENT
                </span>
              )}
            </span>
            <span className="block text-sm text-gray-500 dark:text-gray-400 truncate">
              {aiReady
                ? "Ask me anything — I can search the market for you"
                : "Your assistant — try /find iphone or /help"}
            </span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-light">BOT</span>
        </button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="mb-2">No conversations yet.</p>
          <p className="text-sm">
            Start one from a{" "}
            <Link href="/market" className="text-gold-600 hover:underline">
              seller&apos;s shop
            </Link>{" "}
            or say hi on the{" "}
            <Link href="/feed" className="text-gold-600 hover:underline">
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
                className="w-full text-left rounded-xl border border-[var(--border-subtle)] p-4 hover:bg-[var(--surface-2)] hover:border-gold-200 transition-all flex items-center gap-3"
              >
                {thread.group ? (
                  <span className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center">
                    <Users size={20} className="text-white" />
                  </span>
                ) : (
                  <Avatar user={other ?? {}} size={48} online={isOnline} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">
                      {thread.group ? thread.group.name : other?.name || other?.username || "Unknown"}
                    </p>
                    {thread.lastMessageAt && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(thread.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {thread.product && (
                    <span className="inline-block mt-0.5 text-xs bg-gold-50 dark:bg-gold-950/40 text-gold-600 rounded-full px-2 py-0.5 truncate max-w-full">
                      {thread.product.name}
                    </span>
                  )}
                  <p className={`text-sm truncate mt-1 ${thread.unreadCount > 0 ? "font-semibold text-slate-900 dark:text-slate-100" : "text-gray-500 dark:text-gray-400"}`}>
                    {thread.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="bg-gold-600 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center shrink-0">
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
