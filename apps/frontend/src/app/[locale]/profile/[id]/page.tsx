"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  createdAt: string;
  isFollowing: boolean;
  accountPrivate?: boolean;
  followRequested?: boolean;
  _count: { posts: number; followers: number; following: number };
};

type FollowRequest = {
  id: string;
  follower: { id: string; name: string | null; username: string | null; image: string | null };
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    // A private account the viewer does not follow answers 403; treat that
    // as an empty (locked) feed rather than showing stale or misleading posts.
    const res = await fetch(`/api/profiles/${id}/posts`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.items ?? []);
    } else {
      setPosts([]);
    }
  }, [id]);

  // Refresh after follow/unfollow: follow state decides what the visitor sees.
  const refresh = useCallback(async () => {
    const [p] = await Promise.all([
      fetch(`/api/profiles/${id}`).then((r) => (r.ok ? r.json() : null)),
      loadPosts(),
    ]);
    if (p) setProfile(p);
  }, [id, loadPosts]);

  useEffect(() => {
    if (status !== "authenticated" && status !== "unauthenticated") return;
    Promise.all([
      fetch(`/api/profiles/${id}`).then((r) => (r.ok ? r.json() : null)),
      loadPosts(),
    ])
      .then(async ([p]) => {
        setProfile(p);
        // Own profile: surface pending follow requests to approve or decline.
        if (p?.id && p.id === session?.user?.id) {
          const res = await fetch("/api/follow-requests");
          if (res.ok) {
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id, status, loadPosts, session?.user?.id]);

  if (loading || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-40 rounded-2xl bg-[var(--surface-2)] animate-pulse mb-16" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isMe = session?.user?.id === profile.id;
  // Private accounts only show posts to the account holder and their followers.
  const locked = Boolean(profile.accountPrivate) && !isMe && !profile.isFollowing;
  // The API zeroes the count for locked profiles; keep the UI honest even if
  // a stale payload slips through.
  const visiblePostCount = locked ? 0 : profile._count.posts;

  async function respondToRequest(requestId: string, accept: boolean) {
    const res = await fetch(`/api/follow-requests/${requestId}/${accept ? "accept" : "decline"}`, {
      method: "POST",
    });
    if (!res.ok) return;
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (accept) refresh(); // The new follower's count changed.
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative mb-14">
        <div
          className={`h-44 rounded-2xl overflow-hidden ${
            profile.coverImage ? "" : "bg-gradient-to-r from-gold to-gold-light"
          }`}
        >
          {profile.coverImage && (
            <Image src={profile.coverImage} alt="" width={1200} height={400} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-10 left-6 ring-4 ring-white rounded-full">
          <Avatar user={profile} size={88} />
        </div>
        <div className="absolute -bottom-8 right-6 flex gap-2">
          {isMe ? (
            <Link
              href="/profile/edit"
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
            >
              Edit profile
            </Link>
          ) : (
            <FollowButton
              userId={profile.id}
              initialFollowing={profile.isFollowing}
              initialRequested={Boolean(profile.followRequested)}
              onChange={refresh}
            />
          )}
        </div>
      </div>

      {isMe && requests.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] p-4">
          <h2 className="font-bold mb-3">{t("followRequests")}</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar user={r.follower} size={40} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${r.follower.id}`}
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
                  className="rounded-full bg-gold-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-gold-700"
                >
                  {t("accept")}
                </button>
                <button
                  onClick={() => respondToRequest(r.id, false)}
                  className="rounded-full border border-gray-300 text-gray-700 dark:text-gray-300 px-4 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  {t("decline")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
        {profile.username && <p className="text-gray-400">@{profile.username}</p>}
        {profile.bio && <p className="mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{profile.bio}</p>}
        <div className="flex gap-5 mt-3 text-sm">
          <span>
            <strong>{visiblePostCount}</strong> <span className="text-gray-500 dark:text-gray-400">posts</span>
          </span>
          <span>
            <strong>{profile._count.followers}</strong>{" "}
            <span className="text-gray-500 dark:text-gray-400">followers</span>
          </span>
          <span>
            <strong>{profile._count.following}</strong>{" "}
            <span className="text-gray-500 dark:text-gray-400">following</span>
          </span>
          <span className="text-gray-400">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {locked ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 py-12 px-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
            <Lock size={22} />
          </span>
          <h2 className="text-lg font-bold">{t("lockedTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("lockedText")}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No posts yet.</p>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))}
              onEdited={(updated) =>
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
