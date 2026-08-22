"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard, FeedPost } from "@/components/social/PostCard";

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  createdAt: string;
  isFollowing: boolean;
  _count: { posts: number; followers: number; following: number };
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    const res = await fetch(`/api/profiles/${id}/posts`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.items ?? []);
    }
  }, [id]);

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
        <div className="h-40 rounded-2xl bg-gray-100 animate-pulse mb-16" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isMe = session?.user?.id === profile.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative mb-14">
        <div
          className={`h-44 rounded-2xl overflow-hidden ${
            profile.coverImage ? "" : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          }`}
        >
          {profile.coverImage && (
            <img src={profile.coverImage} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-10 left-6 ring-4 ring-white rounded-full">
          <Avatar user={profile} size={88} />
        </div>
        <div className="absolute -bottom-8 right-6 flex gap-2">
          {isMe ? (
            <Link
              href="/profile/edit"
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Edit profile
            </Link>
          ) : (
            <FollowButton userId={profile.id} initialFollowing={profile.isFollowing} />
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
        {profile.username && <p className="text-gray-400">@{profile.username}</p>}
        {profile.bio && <p className="mt-2 text-slate-700 whitespace-pre-wrap">{profile.bio}</p>}
        <div className="flex gap-5 mt-3 text-sm">
          <span>
            <strong>{profile._count.posts}</strong> <span className="text-gray-500">posts</span>
          </span>
          <span>
            <strong>{profile._count.followers}</strong>{" "}
            <span className="text-gray-500">followers</span>
          </span>
          <span>
            <strong>{profile._count.following}</strong>{" "}
            <span className="text-gray-500">following</span>
          </span>
          <span className="text-gray-400">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="space-y-5">
        {posts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))}
            />
          ))
        )}
      </div>
    </div>
  );
}
