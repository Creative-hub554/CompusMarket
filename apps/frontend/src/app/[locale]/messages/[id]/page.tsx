"use client";


import { toast } from "@/components/ui/toast";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo, uploadFile, useAuthSocket } from "@/lib/social";

type Attachment = { url: string; kind: "IMAGE" | "VIDEO" };

type ChatMessage = {
  id: string;
  threadId?: string;
  senderId: string;
  content: string;
  attachments?: Attachment[] | null;
  createdAt: string;
  sender?: { id: string; name: string | null; image: string | null };
};

type ThreadInfo = {
  id: string;
  participants: { id: string; name: string | null; username: string | null; image: string | null }[];
  product: { id: string; name: string; price: unknown; images: unknown } | null;
};

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const socketRef = useAuthSocket(session?.user?.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/threads/${id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          setMessages([...data.items].reverse());
        }
      })
      .catch(() => {});
    fetch("/api/threads")
      .then((r) => r.json())
      .then((threads: ThreadInfo[]) => {
        const t = Array.isArray(threads) ? threads.find((x) => x.id === id) : null;
        if (t) setThread(t);
      })
      .catch(() => {});
  }, [id, session?.user?.id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !session?.user?.id) return;

    socket.emit("joinThread", { threadId: id });
    socket.emit("markAsRead", { threadId: id });
    socket.emit("presenceSnapshot");

    socket.on("presenceSnapshot", ({ online: ids }: { online: string[] }) => {
      const other = thread?.participants[0]?.id;
      if (other) setOnline(ids.includes(other));
    });
    socket.on("presence", ({ userId, online: isOnline }: { userId: string; online: boolean }) => {
      if (userId === thread?.participants[0]?.id) setOnline(isOnline);
    });
    socket.on("newMessage", (msg: ChatMessage) => {
      if (msg.threadId && msg.threadId !== id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      if (msg.senderId !== session.user?.id) {
        socket.emit("markAsRead", { threadId: id });
      }
    });
    socket.on("typing", ({ userId, typing }: { userId: string; typing: boolean }) => {
      if (userId === session.user?.id) return;
      setPeerTyping(typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typing) {
        typingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    });

    return () => {
      socket.off("presenceSnapshot");
      socket.off("presence");
      socket.off("newMessage");
      socket.off("typing");
    };
  }, [socketRef.current, id, session?.user?.id, thread?.participants]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerTyping]);

  const sendMessage = useCallback(() => {
    const content = input.trim();
    if ((!content && pending.length === 0) || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      threadId: id,
      content,
      attachments: pending.length > 0 ? pending : undefined,
    });
    setInput("");
    setPending([]);
  }, [input, pending, id, socketRef.current]);

  const handleTyping = () => {
    socketRef.current?.emit("typing", { threadId: id, typing: true });
  };

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        const { url } = await uploadFile(file);
        setPending((prev) => [
          ...prev,
          { url, kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE" },
        ]);
      }
    } catch {
      toast.error("Upload failed. Is storage running?");
    }
    setUploading(false);
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  const other = thread?.participants[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Link href="/messages" className="text-gray-500 dark:text-gray-400 hover:text-slate-900 dark:text-slate-100 text-xl leading-none">
          ←
        </Link>
        <Avatar user={other ?? {}} size={40} online={online} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {other?.name || other?.username || "Chat"}
          </p>
          {peerTyping ? (
            <p className="text-xs text-indigo-500">typing…</p>
          ) : (
            <p className="text-xs text-gray-400">{online ? "Online" : "Offline"}</p>
          )}
        </div>
        {thread?.product && (
          <span className="hidden sm:inline-block text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-full px-3 py-1 truncate max-w-[180px]">
            {thread.product.name}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-12">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === session.user?.id;
          const attachments = (msg.attachments ?? []) as Attachment[];
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-[var(--surface)] border border-[var(--border-subtle)] rounded-bl-sm"
                }`}
              >
                {attachments.length > 0 && (
                  <div className={`grid gap-1 mb-1 ${attachments.length > 1 ? "grid-cols-2" : ""}`}>
                    {attachments.map((a, i) =>
                      a.kind === "IMAGE" ? (
                        <Image
                          key={i}
                          src={a.url}
                          alt="attachment"
                          width={512}
                          height={256}
                          className="rounded-lg max-h-64 w-full object-cover"
                        />
                      ) : (
                        <video key={i} src={a.url} controls className="rounded-lg max-h-64 w-full" />
                      )
                    )}
                  </div>
                )}
                {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                <p className={`text-[10px] mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pending.length > 0 && (
        <div className="flex gap-2 pb-2 flex-wrap">
          {pending.map((a, i) => (
            <span key={i} className="relative">
              {a.kind === "IMAGE" ? (
                <Image src={a.url} alt="pending" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <video src={a.url} className="h-14 w-14 rounded-lg object-cover" />
              )}
              <button
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove attachment"
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 pt-2 border-t">
        <label className="cursor-pointer p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600" title="Attach photo or video">
          <input
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading ? "…" : "＋"}
        </label>
        <textarea
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
            handleTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 resize-none border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={(!input.trim() && pending.length === 0) || uploading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
