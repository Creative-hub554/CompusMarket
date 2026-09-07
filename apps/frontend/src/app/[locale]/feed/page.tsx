"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Composer } from "@/components/social/Composer";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { StoriesBar } from "@/components/social/StoriesBar";
import { ReelsStrip } from "@/components/market/ReelsStrip";
import { HomeMarketplace } from "@/components/market/HomeMarketplace";
import { HomeShops } from "@/components/market/HomeShops";

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
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
        <p className="text-gray-600 dark:text-gray-300 mb-4">Please sign in to see your feed.</p>
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Shorts / watch & shop */}
      <ReelsStrip />

      {/* Every shop in the marketplace */}
      <HomeShops />

      {/* Marketplace discovery: search + category filter + products */}
      <HomeMarketplace />

      {/* News feed */}
      <div className="mx-auto max-w-3xl space-y-5">
        <StoriesBar />
        <Composer onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])} />

        {loading ? (
          <div className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-4 animate-pulse">
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-11 h-11 rounded-full bg-gray-200" />
                  <div className="space-y-2">
                    <div className="w-32 h-3 bg-gray-200 rounded" />
                    <div className="w-20 h-2 bg-[var(--surface-2)] rounded" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-full h-3 bg-[var(--surface-2)] rounded" />
                  <div className="w-2/3 h-3 bg-[var(--surface-2)] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-10 text-center text-gray-500 dark:text-gray-400">
            <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Your feed is empty</p>
            <p className="text-sm">Follow people to fill it up — or browse the shops above.</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                onEdited={(updated) =>
                  setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                }
              />
            ))}
            <div ref={sentinelRef} />
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-gray-400 text-sm py-4">You&apos;re all caught up ✨</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
