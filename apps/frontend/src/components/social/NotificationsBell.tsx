"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { Avatar } from "./Avatar";
import { FollowButton } from "./FollowButton";
import { timeAgo, useAuthSocket } from "@/lib/social";

type Notification = {
  id: string;
  kind: "REACTION" | "COMMENT" | "FOLLOW" | "FOLLOW_REQUEST" | "FOLLOW_ACCEPTED" |
  "MESSAGE" | "GROUP_POST" | "JOIN_REQUEST" | "MENTION" | "JOB_ALERT" |
  "REPORT_RESOLVED" | "ROLE_CHANGED" | "ACCOUNT_BANNED";
  entityId: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string | null; username: string | null; image: string | null };
};

type FollowRequest = {
  id: string;
  follower: { id: string; name: string | null; username: string | null; image: string | null };
};

type Suggestion = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  _count: { followers: number };
};

const KIND_ICON: Record<Notification["kind"], string> = {
  REACTION: "❤️",
  COMMENT: "💬",
  FOLLOW: "👤",
  FOLLOW_REQUEST: "🙋",
  FOLLOW_ACCEPTED: "✅",
  MESSAGE: "✉️",
  GROUP_POST: "👥",
  JOIN_REQUEST: "🙋",
  MENTION: "@",
  JOB_ALERT: "💼",
  REPORT_RESOLVED: "🚩",
  ROLE_CHANGED: "🛡️",
  ACCOUNT_BANNED: "🚫",
};

type Tab = "notifications" | "people";

export function NotificationsBell() {
  const t = useTranslations("notifications");
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notifications");
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const socketRef = useAuthSocket(session?.user?.id);

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

  const loadPeople = useCallback(() => {
    if (!session?.user?.id) return;
    fetch("/api/follow-requests")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/suggestions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => {});
    setPeopleLoaded(true);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    refresh();
    const timer = setInterval(refresh, 45000);
    return () => clearInterval(timer);
  }, [session?.user?.id, refresh]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onNotification = (n: Notification) => {
      setUnread((u) => u + 1);
      setItems((prev) => [n, ...prev].slice(0, 30));
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socketRef.current, session?.user?.id]);

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

  async function respondToRequest(requestId: string, accept: boolean) {
    const res = await fetch(`/api/follow-requests/${requestId}/${accept ? "accept" : "decline"}`, {
      method: "POST",
    });
    if (!res.ok) return;
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    // Accepting a follow changes the unread count + follower counts downstream.
    refresh();
  }

  function href(n: Notification): string {
    switch (n.kind) {
      case "MESSAGE":
        return n.entityId ? `/messages/${n.entityId}` : "/messages";
      case "FOLLOW":
      case "FOLLOW_REQUEST":
      case "FOLLOW_ACCEPTED":
        return `/profile/${n.actor.id}`;
      case "GROUP_POST":
      case "JOIN_REQUEST":
        return n.entityId ? `/community/groups/${n.entityId}` : "/community/groups";
      case "MENTION":
        return "/feed";
      case "JOB_ALERT":
        return n.entityId ? `/jobs/${n.entityId}` : "/jobs";
      default:
        return n.entityId ? `/feed` : "/feed";
    }
  }

  if (!session?.user) return null;

  const tabCls = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? "bg-gold-500/15 text-gold-700 dark:text-gold-300"
        : "text-slate-500 hover:bg-[var(--surface-2)] dark:text-slate-400"
    }`;

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
        <div className="absolute right-0 top-full mt-2 bg-[var(--surface)] rounded-xl shadow-xl border border-gray-100 min-w-80 max-w-sm z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {t("title")}
            </span>
            {tab === "notifications" && unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-gold-600 hover:underline">
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Tab switcher: Notifications | People */}
          <div className="flex gap-1 px-3 pt-2">
            <button onClick={() => setTab("notifications")} className={tabCls(tab === "notifications")}>
              {t("tabsNotifications")}
            </button>
            <button
              onClick={() => {
                setTab("people");
                if (!peopleLoaded) loadPeople();
              }}
              className={tabCls(tab === "people")}
            >
              {t("tabsPeople")}
            </button>
          </div>

          {tab === "notifications" ? (
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t("nothingYet")}</p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={href(n)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors ${
                      n.readAt ? "" : "bg-gold-50 dark:bg-gold-950/40/60"
                    }`}
                  >
                    <Avatar user={n.actor} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        {KIND_ICON[n.kind]}{" "}
                        <strong>{n.actor.name || n.actor.username || "Someone"}</strong>{" "}
                        {n.kind === "REACTION" && `reacted ${n.message ?? ""} to your post`}
                        {n.kind === "COMMENT" && "commented on your post"}
                        {n.kind === "FOLLOW" && "started following you"}
                        {n.kind === "FOLLOW_REQUEST" && "requested to follow you"}
                        {n.kind === "FOLLOW_ACCEPTED" && "accepted your follow request"}
                        {n.kind === "MESSAGE" && "sent you a message"}
                        {n.kind === "GROUP_POST" && `posted in ${n.message ?? "a group"}`}
                        {n.kind === "JOIN_REQUEST" && "wants to join your group"}
                        {n.kind === "MENTION" && "mentioned you in a post"}
                        {n.kind === "JOB_ALERT" && `New job matching your history: ${n.message ?? ""}`}
                        {n.kind === "REPORT_RESOLVED" && (n.message ?? "reviewed your report")}
                        {n.kind === "ROLE_CHANGED" && (n.message ?? "changed your role")}
                        {n.kind === "ACCOUNT_BANNED" && (n.message ?? "banned your account")}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Follow requests */}
              {requests.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    {t("followRequests")}
                  </p>
                  <div className="space-y-2.5">
                    {requests.map((r) => (
                      <div key={r.id} className="flex items-center gap-2.5">
                        <Avatar user={r.follower} size={36} />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${r.follower.id}`}
                            onClick={() => setOpen(false)}
                            className="text-sm font-semibold hover:underline block truncate"
                          >
                            {r.follower.name || r.follower.username || "Someone"}
                          </Link>
                          {r.follower.username && (
                            <p className="text-xs text-gray-400 truncate">@{r.follower.username}</p>
                          )}
                        </div>
                        <button
                          onClick={() => respondToRequest(r.id, true)}
                          className="rounded-full bg-gold-600 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-gold-700"
                        >
                          {t("accept")}
                        </button>
                        <button
                          onClick={() => respondToRequest(r.id, false)}
                          className="rounded-full border border-gray-300 text-gray-700 dark:text-gray-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          {t("decline")}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested follows */}
              <div className="px-4 pt-3 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  {t("suggestions")}
                </p>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t("noSuggestions")}</p>
                ) : (
                  <div className="space-y-2.5">
                    {suggestions.map((user) => (
                      <div key={user.id} className="flex items-center gap-2.5">
                        <Link href={`/profile/${user.id}`} onClick={() => setOpen(false)}>
                          <Avatar user={user} size={36} />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${user.id}`}
                            onClick={() => setOpen(false)}
                            className="text-sm font-semibold hover:underline block truncate"
                          >
                            {user.name || user.username}
                          </Link>
                          <p className="text-xs text-gray-400 truncate">
                            {user._count?.followers ?? 0}{" "}
                            {user._count?.followers === 1 ? t("followerOne") : t("followers")}
                          </p>
                        </div>
                        <FollowButton userId={user.id} initialFollowing={false} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}