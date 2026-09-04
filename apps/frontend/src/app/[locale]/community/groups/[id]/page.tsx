"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { Users, MessageSquare, ArrowLeft, X, Crown, ImagePlus, Lock } from "lucide-react";
import { Composer } from "@/components/social/Composer";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/lib/social";

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  creatorId: string;
  creator: { id: string; name: string | null; username: string | null; image: string | null };
  memberCount: number;
  postCount: number;
  isMember: boolean;
  isCreator: boolean;
  myRole: string | null;
  hasPendingRequest?: boolean;
  members: {
    userId: string;
    role: string;
    user: { id: string; name: string | null; username: string | null; image: string | null };
  }[];
};

type JoinRequest = {
  userId: string;
  user: { id: string; name: string | null; username: string | null; image: string | null };
  createdAt: string;
};

export default function GroupDetailPage() {
  const t = useTranslations("groups");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const isAdmin = group?.isMember && (group.myRole === "ADMIN" || group.isCreator);

  const loadPosts = useCallback(
    async (cursor?: string) => {
      const res = await fetch(
        `/api/groups/${id}/posts${cursor ? `?cursor=${cursor}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      }
    },
    [id]
  );

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${id}`).then((r) => (r.ok ? r.json() : null)),
      loadPosts(),
    ])
      .then(([g]) => {
        if (g) setGroup(g);
      })
      .finally(() => setLoading(false));
  }, [id, loadPosts]);

  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}/requests`);
    if (res.ok) setRequests(await res.json());
  }, [id]);

  useEffect(() => {
    if (isAdmin) loadRequests();
    else setRequests([]);
  }, [isAdmin, loadRequests]);

  async function respond(requestUserId: string, accept: boolean) {
    const res = await fetch(
      `/api/groups/${id}/requests/${requestUserId}/${accept ? "accept" : "decline"}`,
      { method: "POST" }
    );
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.userId !== requestUserId));
      if (accept) {
        setGroup((g) => (g ? { ...g, memberCount: g.memberCount + 1 } : g));
      }
      toast.success(accept ? t("acceptedToast") : t("declinedToast"));
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
  }

  async function toggleMembership() {
    if (!group) return;
    setBusy(true);
    const action =
      !group.isMember && group.hasPendingRequest ? "leave" : group.isMember ? "leave" : "join";
    const res = await fetch(`/api/groups/${id}/${action}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.requested) {
        setGroup({ ...group, hasPendingRequest: true });
        toast.success(t("requestSentToast"));
      } else if (data.cancelled) {
        setGroup({ ...group, hasPendingRequest: false });
        toast.success(t("requestCancelledToast"));
      } else {
        const joined = data.joined as boolean;
        setGroup({
          ...group,
          isMember: joined,
          memberCount: group.memberCount + (joined ? 1 : -1),
        });
        toast.success(joined ? t("joinedToast") : t("leftToast"));
      }
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
    setBusy(false);
  }

  async function openChat() {
    setOpeningChat(true);
    const res = await fetch(`/api/groups/${id}/thread`, { method: "POST" });
    if (res.ok) {
      const { id: threadId } = await res.json();
      router.push(`/messages/${threadId}`);
    } else {
      toast.error(t("actionFailed"));
      setOpeningChat(false);
    }
  }

  async function removeMember(userId: string) {
    if (!group) return;
    if (!window.confirm(t("kickConfirm"))) return;
    const res = await fetch(`/api/groups/${id}/members/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setGroup({
        ...group,
        members: group.members.filter((m) => m.userId !== userId),
        memberCount: group.memberCount - 1,
      });
      toast.success(t("kickDone"));
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
  }

  async function setRole(userId: string, role: "ADMIN" | "MEMBER") {
    if (!group) return;
    const res = await fetch(`/api/groups/${id}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setGroup({
        ...group,
        members: group.members.map((m) =>
          m.userId === userId ? { ...m, role } : m
        ),
      });
      toast.success(role === "ADMIN" ? t("promoted") : t("demoted"));
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
  }

  async function togglePin(post: FeedPost) {
    const res = await fetch(`/api/groups/${id}/posts/${post.id}/pin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !post.pinned }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, pinned: !post.pinned } : p))
      );
      toast.success(!post.pinned ? t("pinnedToast") : t("unpinnedToast"));
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
  }

  async function handleCover(files: FileList | null) {
    if (!files?.[0] || !group) return;
    setCoverUploading(true);
    try {
      const { url } = await uploadFile(files[0]);
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: url }),
      });
      if (res.ok) {
        setGroup({ ...group, coverUrl: url });
        toast.success(t("coverUpdated"));
      } else {
        toast.error(t("actionFailed"));
      }
    } catch {
      toast.error(t("actionFailed"));
    }
    setCoverUploading(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <div className="h-36 rounded-2xl animate-shimmer" />
        <div className="h-24 rounded-2xl animate-shimmer" />
        <div className="h-48 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">{t("notFound")}</p>
        <Link href="/community/groups" className="btn-primary no-underline">
          {t("backToGroups")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
      <Link
        href="/community/groups"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-gold-600 mb-4 no-underline"
      >
        <ArrowLeft size={15} /> {t("backToGroups")}
      </Link>

      <div className="card rounded-2xl overflow-hidden mb-5">
        {group.coverUrl ? (
          <div className="relative h-36 bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={group.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {isAdmin && (
              <label
                className="absolute bottom-2 right-2 cursor-pointer inline-flex items-center gap-1 rounded-full bg-black/50 text-white text-xs px-3 py-1.5 hover:bg-black/70 transition-colors"
                title={t("changeCover")}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCover(e.target.files)}
                  disabled={coverUploading}
                />
                <ImagePlus size={13} />
                {coverUploading ? "…" : t("changeCover")}
              </label>
            )}
          </div>
        ) : isAdmin ? (
          <label
            className="flex h-16 cursor-pointer items-center justify-center gap-1.5 bg-gradient-to-r from-gold-500/10 to-gold-500/10 text-xs text-slate-400 hover:from-gold-500/20 hover:to-gold-500/20 hover:text-gold-500 transition-colors"
            title={t("changeCover")}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleCover(e.target.files)}
              disabled={coverUploading}
            />
            <ImagePlus size={14} />
            {coverUploading ? "…" : t("addCover")}
          </label>
        ) : null}

        <div className="p-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
          {group.name}
          {group.privacy === "PRIVATE" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
              <Lock size={11} /> {t("privacyPrivate")}
            </span>
          )}
        </h1>
        {group.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {group.description}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {group.memberCount} {t("members")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={13} /> {group.postCount} {t("posts")}
          </span>
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {session?.user && !group.isCreator && (
            <button
              onClick={toggleMembership}
              disabled={busy}
              className={
                group.isMember
                  ? "btn-ghost"
                  : group.hasPendingRequest
                    ? "btn-ghost !text-gold-600 dark:!text-gold-400"
                    : "btn-primary"
              }
            >
              {busy
                ? "…"
                : group.isMember
                  ? t("leave")
                  : group.hasPendingRequest
                    ? t("requested")
                    : group.privacy === "PRIVATE"
                      ? t("requestToJoin")
                      : t("join")}
            </button>
          )}
          {session?.user && group.isMember && (
            <button
              onClick={openChat}
              disabled={openingChat}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <MessageSquare size={15} />
              {openingChat ? "…" : t("openChat")}
            </button>
          )}
        </div>

        {group.members.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              {t("members")}
            </p>
            <div className="flex flex-wrap gap-3">
              {group.members.map((m) => {
                const canKick =
                  isAdmin &&
                  m.userId !== group.creatorId &&
                  (group.isCreator || m.role !== "ADMIN");
                return (
                  <div key={m.userId} className="flex items-center gap-1">
                    <Link
                      href={`/profile/${m.userId}`}
                      className="flex items-center gap-1.5 no-underline"
                      title={m.user.name || m.user.username || undefined}
                    >
                      <Avatar user={m.user} size={28} />
                      <span className="text-xs text-slate-600 dark:text-slate-300 max-w-24 truncate">
                        {m.user.name || m.user.username}
                        {m.role === "ADMIN" && (
                          <span className="text-gold-500 font-semibold"> ★</span>
                        )}
                      </span>
                    </Link>
                    {canKick && (
                      <button
                        onClick={() => removeMember(m.userId)}
                        aria-label={t("kick")}
                        title={t("kick")}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {group.isCreator && m.userId !== group.creatorId && (
                      <button
                        onClick={() =>
                          setRole(m.userId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")
                        }
                        aria-label={
                          m.role === "ADMIN" ? t("demote") : t("promote")
                        }
                        title={m.role === "ADMIN" ? t("demote") : t("promote")}
                        className={`transition-colors ${
                          m.role === "ADMIN"
                            ? "text-amber-500"
                            : "text-slate-300 hover:text-amber-500"
                        }`}
                      >
                        <Crown size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isAdmin && requests.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              {t("joinRequests")}
            </p>
            <div className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.userId}
                  className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2"
                >
                  <Link href={`/profile/${r.userId}`} className="flex items-center gap-2 flex-1 min-w-0 no-underline">
                    <Avatar user={r.user} size={30} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {r.user.name || r.user.username}
                    </span>
                  </Link>
                  <button
                    onClick={() => respond(r.userId, true)}
                    className="btn-primary !py-1 !px-3 text-xs"
                  >
                    {t("accept")}
                  </button>
                  <button
                    onClick={() => respond(r.userId, false)}
                    className="btn-ghost"
                  >
                    {t("decline")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {group.privacy === "PRIVATE" && !group.isMember ? (
        <div className="text-center py-12 card rounded-2xl">
          <Lock size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t("privateGroup")}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("privateGroupText")}</p>
        </div>
      ) : (
        <>
          {group.isMember && (
            <div className="mb-5">
              <Composer
                groupId={group.id}
                onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])}
              />
            </div>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                onEdited={(updated) =>
                  setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                }
                onTogglePin={isAdmin ? (pinned) => togglePin(post) : undefined}
              />
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 card rounded-2xl">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{t("noPosts")}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("noPostsText")}</p>
              </div>
            )}
            {nextCursor && (
              <div className="text-center pt-1">
                <button
                  onClick={() => loadPosts(nextCursor)}
                  className="btn-ghost"
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
