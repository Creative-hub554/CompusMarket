"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { apiFetch } from "@/lib/apiFetch";
import { useTranslations } from "next-intl";
import { Users, MessageSquare, ArrowLeft, X, Crown, ImagePlus, Lock } from "lucide-react";
import { Composer } from "@/components/social/Composer";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "@/components/ui/toast";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
      try {
        const data = await apiFetch<{
          items: FeedPost[];
          nextCursor: string | null;
        }>(`/api/groups/${id}/posts${cursor ? `?cursor=${cursor}` : ""}`);
        setPosts((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch {
        /* keep current posts on failure */
      }
    },
    [id]
  );

  useEffect(() => {
    Promise.all([
      apiFetch<GroupDetail | null>(`/api/groups/${id}`).catch(() => null),
      loadPosts(),
    ])
      .then(([g]) => {
        if (g) setGroup(g);
      })
      .finally(() => setLoading(false));
  }, [id, loadPosts]);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await apiFetch<JoinRequest[]>(`/api/groups/${id}/requests`));
    } catch {
      /* keep current requests on failure */
    }
  }, [id]);

  useEffect(() => {
    if (isAdmin) loadRequests();
    else setRequests([]);
  }, [isAdmin, loadRequests]);

  async function respond(requestUserId: string, accept: boolean) {
    try {
      await apiFetch(
        `/api/groups/${id}/requests/${requestUserId}/${accept ? "accept" : "decline"}`,
        { method: "POST" }
      );
      setRequests((prev) => prev.filter((r) => r.userId !== requestUserId));
      if (accept) {
        setGroup((g) => (g ? { ...g, memberCount: g.memberCount + 1 } : g));
      }
      toast.success(accept ? t("acceptedToast") : t("declinedToast"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  async function toggleMembership() {
    if (!group) return;
    setBusy(true);
    const action =
      !group.isMember && group.hasPendingRequest ? "leave" : group.isMember ? "leave" : "join";
    try {
      const data = await apiFetch<{
        requested?: boolean;
        cancelled?: boolean;
        joined?: boolean;
      }>(`/api/groups/${id}/${action}`, { method: "POST" });
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
    setBusy(false);
  }

  async function openChat() {
    setOpeningChat(true);
    try {
      const { id: threadId } = await apiFetch<{ id: string }>(
        `/api/groups/${id}/thread`,
        { method: "POST" }
      );
      router.push(`/messages/${threadId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
      setOpeningChat(false);
    }
  }

  async function removeMember(userId: string) {
    if (!group) return;
    if (!window.confirm(t("kickConfirm"))) return;
    try {
      await apiFetch(`/api/groups/${id}/members/${userId}`, {
        method: "DELETE",
      });
      setGroup({
        ...group,
        members: group.members.filter((m) => m.userId !== userId),
        memberCount: group.memberCount - 1,
      });
      toast.success(t("kickDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  async function setRole(userId: string, role: "ADMIN" | "MEMBER") {
    if (!group) return;
    try {
      await apiFetch(`/api/groups/${id}/members/${userId}`, {
        method: "PATCH",
        body: { role },
      });
      setGroup({
        ...group,
        members: group.members.map((m) =>
          m.userId === userId ? { ...m, role } : m
        ),
      });
      toast.success(role === "ADMIN" ? t("promoted") : t("demoted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  async function togglePin(post: FeedPost) {
    try {
      await apiFetch(`/api/groups/${id}/posts/${post.id}/pin`, {
        method: "PATCH",
        body: { pinned: !post.pinned },
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, pinned: !post.pinned } : p))
      );
      toast.success(!post.pinned ? t("pinnedToast") : t("unpinnedToast"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  async function handleCover(files: FileList | null) {
    if (!files?.[0] || !group) return;
    setCoverUploading(true);
    try {
      const { url } = await uploadFile(files[0]);
      try {
        await apiFetch(`/api/groups/${id}`, {
          method: "PATCH",
          body: { coverUrl: url },
        });
        setGroup({ ...group, coverUrl: url });
        toast.success(t("coverUpdated"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("actionFailed"));
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
              <ErrorBoundary label="group composer" fallback={({ reset }) => (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50 text-red-500">
                      <AlertTriangle size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Couldn&apos;t load the group composer
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Something went wrong. Try again below.
                      </p>
                    </div>
                    <button onClick={reset} className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-sm">
                      <RotateCcw size={14} />
                      Retry
                    </button>
                  </div>
                </div>
              )}>
                <Composer
                  groupId={group.id}
                  onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])}
                />
              </ErrorBoundary>
            </div>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <ErrorBoundary key={post.id} label={`group post ${post.id}`}>
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  onEdited={(updated) =>
                    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                  }
                  onTogglePin={isAdmin ? (pinned) => togglePin(post) : undefined}
                />
              </ErrorBoundary>
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
