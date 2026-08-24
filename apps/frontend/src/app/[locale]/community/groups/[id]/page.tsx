"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Users, MessageSquare, ArrowLeft } from "lucide-react";
import { Composer } from "@/components/social/Composer";
import { PostCard, type FeedPost } from "@/components/social/PostCard";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "@/components/ui/toast";

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  creator: { id: string; name: string | null; username: string | null; image: string | null };
  memberCount: number;
  postCount: number;
  isMember: boolean;
  isCreator: boolean;
  members: {
    userId: string;
    role: string;
    user: { id: string; name: string | null; username: string | null; image: string | null };
  }[];
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

  async function toggleMembership() {
    if (!group) return;
    setBusy(true);
    const action = group.isMember ? "leave" : "join";
    const res = await fetch(`/api/groups/${id}/${action}`, { method: "POST" });
    if (res.ok) {
      const { joined } = await res.json();
      setGroup({
        ...group,
        isMember: joined,
        memberCount: group.memberCount + (joined ? 1 : -1),
      });
      toast.success(joined ? t("joinedToast") : t("leftToast"));
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
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 mb-4 no-underline"
      >
        <ArrowLeft size={15} /> {t("backToGroups")}
      </Link>

      <div className="card rounded-2xl p-6 mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {group.name}
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
              className={group.isMember ? "btn-ghost" : "btn-primary"}
            >
              {busy ? "…" : group.isMember ? t("leave") : t("join")}
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
              {group.members.map((m) => (
                <Link
                  key={m.userId}
                  href={`/profile/${m.userId}`}
                  className="flex items-center gap-1.5 no-underline"
                  title={m.user.name || m.user.username || undefined}
                >
                  <Avatar user={m.user} size={28} />
                  <span className="text-xs text-slate-600 dark:text-slate-300 max-w-24 truncate">
                    {m.user.name || m.user.username}
                    {m.role === "ADMIN" && (
                      <span className="text-indigo-500 font-semibold"> ★</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

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
          <PostCard key={post.id} post={post} />
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
    </div>
  );
}
