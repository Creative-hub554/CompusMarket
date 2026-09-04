"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "@/lib/session-client";
import { Minus, Send, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo, useAuthSocket } from "@/lib/social";

type Participant = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type ThreadMeta = {
  id: string;
  participants: Participant[];
  group: { id: string; name: string } | null;
  lastMessageAt: string | null;
};

type ChatMessage = {
  id: string;
  threadId?: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type ChatSession = {
  threadId: string;
  participant: Participant;
  messages: ChatMessage[];
  minimized: boolean;
  unread: number;
  peerTyping: boolean;
};

type OnlineContact = Participant & { messageCount: number };

const ChatDockContext = createContext<{
  online: Set<string>;
  openWithUser: (user: Participant) => void;
}>({ online: new Set(), openWithUser: () => {} });

export function useChatDock() {
  return useContext(ChatDockContext);
}

function MessageContent({ content }: { content: string }) {
  if (content.startsWith("sticker:")) {
    return <p className="text-4xl leading-none py-0.5">{content.slice(8)}</p>;
  }
  if (content.length > 2 && content.startsWith("_") && content.endsWith("_")) {
    return (
      <p className="text-sm italic whitespace-pre-wrap break-words">
        {content.slice(1, -1)}
      </p>
    );
  }
  return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
}

function displayName(p: Participant | null | undefined) {
  return p?.name || p?.username || "Chat";
}

export function ChatDockProvider({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession();
  const meId = session?.user?.id;
  const socketRef = useAuthSocket(meId);

  const [online, setOnline] = useState<Set<string>>(new Set());
  const [chats, setChats] = useState<ChatSession[]>([]);

  // Latest-state mirrors for use inside stable socket handlers.
  const chatsRef = useRef<ChatSession[]>([]);
  chatsRef.current = chats;
  const threadsRef = useRef<Map<string, ThreadMeta>>(new Map());

  const upsertChat = useCallback((chat: Partial<ChatSession> & { threadId: string; participant: Participant }) => {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.threadId === chat.threadId);
      if (idx === -1) return [{ ...chat, messages: chat.messages ?? [], minimized: chat.minimized ?? false, unread: chat.unread ?? 0, peerTyping: false }, ...prev].slice(0, 4);
      const next = [...prev];
      next[idx] = { ...next[idx], ...chat };
      return next;
    });
  }, []);

  /** Open (or focus) a popup by thread id. */
  const openByThreadId = useCallback(
    (threadId: string, participant: Participant) => {
      const existing = chatsRef.current.find((c) => c.threadId === threadId);
      upsertChat({ threadId, participant, minimized: false });
      socketRef.current?.emit("joinThread", { threadId });
      socketRef.current?.emit("markAsRead", { threadId });
      if (!existing) {
        fetch(`/api/threads/${threadId}/messages`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data?.items)) {
              setChats((prev) =>
                prev.map((c) =>
                  c.threadId === threadId
                    ? { ...c, messages: [...data.items].reverse() }
                    : c
                )
              );
            }
          })
          .catch(() => {});
      }
    },
    [socketRef, upsertChat]
  );

  /** Find-or-create the private thread with a user, then open its popup. */
  const openWithUser = useCallback(
    (user: Participant) => {
      if (!user.id || user.id === meId) return;
      fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
        .then((r) => r.json())
        .then(({ id }: { id: string }) => openByThreadId(id, user))
        .catch(() => {});
    },
    [meId, openByThreadId]
  );

  // Thread metadata cache (for mapping incoming messages → participants).
  useEffect(() => {
    if (!meId) return;
    fetch("/api/threads")
      .then((r) => r.json())
      .then((list: ThreadMeta[]) => {
        if (!Array.isArray(list)) return;
        threadsRef.current = new Map(list.map((t) => [t.id, t]));
      })
      .catch(() => {});
  }, [meId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !meId) return;

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

    socket.on("newMessage", (msg: ChatMessage) => {
      if (!msg.threadId || msg.senderId === meId) return;
      const current = chatsRef.current.find((c) => c.threadId === msg.threadId);

      // Append when the conversation is already docked.
      if (current) {
        setChats((prev) =>
          prev.map((c) =>
            c.threadId === msg.threadId
              ? {
                  ...c,
                  messages: c.messages.some((m) => m.id === msg.id)
                    ? c.messages
                    : [...c.messages, msg],
                  peerTyping: false,
                }
              : c
          )
        );
        if (current.minimized) {
          setChats((prev) =>
            prev.map((c) =>
              c.threadId === msg.threadId ? { ...c, unread: c.unread + 1 } : c
            )
          );
        } else {
          socket.emit("markAsRead", { threadId: msg.threadId });
        }
        return;
      }

      // Otherwise pop a bubble — private threads only.
      const meta = threadsRef.current.get(msg.threadId);
      if (meta?.group) return;
      const participant =
        meta?.participants[0] ?? { id: msg.senderId, name: null, username: null, image: null };
      upsertChat({
        threadId: msg.threadId,
        participant,
        messages: [msg],
        minimized: false,
        unread: 1,
      });
      socket.emit("joinThread", { threadId: msg.threadId });
      socket.emit("markAsRead", { threadId: msg.threadId });
      if (!meta) {
        // Unknown thread: refresh cache so later messages resolve properly.
        fetch("/api/threads")
          .then((r) => r.json())
          .then((list: ThreadMeta[]) => {
            if (Array.isArray(list))
              threadsRef.current = new Map(list.map((t) => [t.id, t]));
          })
          .catch(() => {});
      }
    });

    socket.on("typing", ({ threadId, typing }: { threadId: string; userId: string; typing: boolean }) => {
      setChats((prev) =>
        prev.map((c) => (c.threadId === threadId ? { ...c, peerTyping: !!typing } : c))
      );
    });

    return () => {
      socket.off("presenceSnapshot");
      socket.off("presence");
      socket.off("newMessage");
      socket.off("typing");
    };
  }, [socketRef.current, meId, upsertChat]);

  const value = useMemo(() => ({ online, openWithUser }), [online, openWithUser]);

  return (
    <ChatDockContext.Provider value={value}>
      {children}
      {meId && chats.length > 0 && (
        <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-3">
          {chats.map((chat) => (
            <ChatWindow key={chat.threadId} chat={chat} meId={meId} socketRef={socketRef} onClose={() => setChats((prev) => prev.filter((c) => c.threadId !== chat.threadId))} onToggle={() => {
              const nowMinimized = !chat.minimized;
              upsertChat({ threadId: chat.threadId, participant: chat.participant, minimized: nowMinimized, ...(nowMinimized ? {} : { unread: 0 }) });
              if (!nowMinimized) socketRef.current?.emit("markAsRead", { threadId: chat.threadId });
            }} />
          ))}
        </div>
      )}
    </ChatDockContext.Provider>
  );
}

function ChatWindow({
  chat,
  meId,
  socketRef,
  onClose,
  onToggle,
}: {
  chat: ChatSession;
  meId: string;
  socketRef: ReturnType<typeof useAuthSocket>;
  onClose: () => void;
  onToggle: () => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnline = useChatDock().online.has(chat.participant.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length, chat.peerTyping, chat.minimized]);

  const send = () => {
    const raw = input.trim();
    if (!raw || !socketRef.current) return;
    let content = raw;
    if (raw === "/shrug") content = "¯\\_(ツ)_/¯";
    else if (raw.startsWith("/me ")) content = `_${raw.slice(4)}_`;
    socketRef.current.emit("sendMessage", { threadId: chat.threadId, content });
    setInput("");
  };

  const onInputChange = (v: string) => {
    setInput(v);
    socketRef.current?.emit("typing", { threadId: chat.threadId, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => socketRef.current?.emit("typing", { threadId: chat.threadId, typing: false }),
      2500
    );
  };

  if (chat.minimized) {
    return (
      <button
        onClick={onToggle}
        className="relative rounded-full transition-transform hover:-translate-y-1 focus:outline-none"
        title={displayName(chat.participant)}
      >
        <span className="block rounded-full ring-2 ring-gold-400 shadow-[0_6px_20px_-6px_rgba(212,160,39,0.55)]">
          <Avatar user={chat.participant} size={52} online={isOnline} />
        </span>
        {chat.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-gold-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {chat.unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="section-box w-[320px] sm:w-[340px] h-[440px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gold-500/25 bg-gradient-to-r from-gold-500/10 to-transparent shrink-0">
        <button onClick={onToggle} title="Minimize">
          <Avatar user={chat.participant} size={34} online={isOnline} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{displayName(chat.participant)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {chat.peerTyping ? (
              <span className="text-gold-600 dark:text-gold-light">typing…</span>
            ) : isOnline ? (
              "Online now"
            ) : (
              "Offline"
            )}
          </p>
        </div>
        <Link
          href={`/messages/${chat.threadId}`}
          className="rounded-md p-1.5 text-gray-400 hover:bg-[var(--surface-2)] hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title="Open full conversation"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </Link>
        <button onClick={onToggle} className="rounded-md p-1.5 text-gray-400 hover:bg-[var(--surface-2)] hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="Minimize">
          <Minus size={15} />
        </button>
        <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors" title="Close">
          <X size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {chat.messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                  mine
                    ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-br-sm"
                    : "bg-[var(--surface-2)] text-slate-800 dark:text-slate-100 rounded-bl-sm"
                }`}
              >
                <MessageContent content={m.content} />
                <p className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-gray-400"}`}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {chat.peerTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-2)] rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-gold-500/25 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 min-w-0 rounded-full bg-[var(--surface-2)] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-gold-500/40 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="shrink-0 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-white p-2 disabled:opacity-40 hover:brightness-110 transition"
          title="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

/** Left-rail list: online people ranked by interaction (message count). */
export function OnlineContacts() {
  const { data: session } = useSession();
  const { online, openWithUser } = useChatDock();
  const [contacts, setContacts] = useState<OnlineContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const load = () =>
      fetch("/api/threads/online")
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data)) setContacts(data);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.user?.id]);

  if (!session?.user?.id || loading) return null;
  if (contacts.length === 0) return null;

  return (
    <div>
      <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
        Online · {contacts.length}
      </p>
      <ul className="space-y-0.5">
        {contacts.slice(0, 8).map((c) => (
          <li key={c.id}>
            <button
              onClick={() => openWithUser(c)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--surface-2)] transition-colors text-left"
              title={`Chat with ${displayName(c)}`}
            >
              <Avatar user={c} size={32} online={online.has(c.id)} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                  {displayName(c)}
                </span>
                <span className="block text-[11px] text-gray-400">
                  {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
