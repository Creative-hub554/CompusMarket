"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Composer } from "@/components/social/Composer";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { StoriesBar } from "@/components/social/StoriesBar";
import { FollowButton } from "@/components/social/FollowButton";
import { Avatar } from "@/components/social/Avatar";

type Suggestion = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  _count: { followers: number };
};

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (cursorId?: string | null) => {
    const res = await fetch(`/api/feed${cursorId ? `?cursor=${cursorId}` : ""}`);
    if (!res.ok) return;
    const data = await res.json();
    setPosts((prev) => (cursorId ? [...prev, ...data.items] : data.items));
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadPage();
    fetch("/api/suggestions")
      .then((r) => r.json())
      .then((data) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.user?.id, loadPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor) loadPage(cursor);
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, cursor, loadPage]);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-gray-600 mb-4">Please sign in to see your feed.</p>
        <Link href="/login" className="text-slate-900 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Feed</h1>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-5 min-w-0">
          <StoriesBar />
          <Composer
            onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])}
          />

          {loading ? (
            <div className="space-y-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                  <div className="flex gap-3 items-center mb-4">
                    <div className="w-11 h-11 rounded-full bg-gray-200" />
                    <div className="space-y-2">
                      <div className="w-32 h-3 bg-gray-200 rounded" />
                      <div className="w-20 h-2 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-gray-100 rounded" />
                    <div className="w-2/3 h-3 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
              <p className="font-medium text-slate-800 mb-1">Your feed is empty</p>
              <p className="text-sm">Follow people from the suggestions to fill it up.</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
              <div ref={sentinelRef} />
              {!hasMore && posts.length > 0 && (
                <p className="text-center text-gray-400 text-sm py-4">You&apos;re all caught up ✨</p>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <h2 className="font-semibold text-slate-800">Suggested for you</h2>
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-400">No suggestions right now.</p>
            ) : (
              suggestions.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Link href={`/profile/${user.id}`}>
                    <Avatar user={user} size={40} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${user.id}`} className="text-sm font-semibold hover:underline block truncate">
                      {user.name || user.username}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">
                      {user._count.followers} followers
                    </p>
                  </div>
                  <FollowButton userId={user.id} initialFollowing={false} size="sm" />
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
