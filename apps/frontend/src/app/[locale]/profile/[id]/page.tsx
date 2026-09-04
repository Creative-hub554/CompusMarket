"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  _count: { posts: number; followers: number; following: number };
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
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
      .then(([p]) => setProfile(p))
      .finally(() => setLoading(false));
  }, [id, status, loadPosts]);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative mb-14">
        <div
          className={`h-44 rounded-2xl overflow-hidden ${
            profile.coverImage ? "" : "bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500"
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
            <FollowButton userId={profile.id} initialFollowing={profile.isFollowing} onChange={refresh} />
          )}
        </div>
      </div>

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
