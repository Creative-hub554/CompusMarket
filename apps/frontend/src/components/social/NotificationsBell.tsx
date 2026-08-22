"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/social";

type Notification = {
  id: string;
  kind: "REACTION" | "COMMENT" | "FOLLOW" | "MESSAGE";
  entityId: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; username: string | null; image: string | null };
};

const KIND_ICON: Record<Notification["kind"], string> = {
  REACTION: "❤️",
  COMMENT: "💬",
  FOLLOW: "👤",
  MESSAGE: "✉️",
};

export function NotificationsBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!session?.user?.id) return;
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((count) => setUnread(typeof count === "number" ? count : 0))
      .catch(() => {});
    if (open) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => setItems(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [session?.user?.id, open]);

  useEffect(() => {
    if (!session?.user?.id) return;
    refresh();
    const timer = setInterval(refresh, 45000);
    return () => clearInterval(timer);
  }, [session?.user?.id, refresh]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-read", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  function href(n: Notification): string {
    switch (n.kind) {
      case "MESSAGE":
        return n.entityId ? `/messages/${n.entityId}` : "/messages";
      case "FOLLOW":
        return `/profile/${n.actor.id}`;
      default:
        return n.entityId ? `/feed` : "/feed";
    }
  }

  if (!session?.user) return null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            fetch("/api/notifications")
              .then((r) => r.json())
              .then((data) => setItems(Array.isArray(data) ? data : []))
              .catch(() => {});
          }
        }}
        className="nav-link opacity-90 hover:opacity-100 relative"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs rounded-full h-4 min-w-[1rem] flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 min-w-80 max-w-sm z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="font-semibold text-slate-800 text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={href(n)}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    n.readAt ? "" : "bg-indigo-50/60"
                  }`}
                >
                  <Avatar user={n.actor} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">
                      {KIND_ICON[n.kind]}{" "}
                      <strong>{n.actor.name || n.actor.username || "Someone"}</strong>{" "}
                      {n.kind === "REACTION" && `reacted ${n.message ?? ""} to your post`}
                      {n.kind === "COMMENT" && "commented on your post"}
                      {n.kind === "FOLLOW" && "started following you"}
                      {n.kind === "MESSAGE" && "sent you a message"}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
