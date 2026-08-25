"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Bookmark, Store, Briefcase } from "lucide-react";
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
  const nav = useTranslations("nav");
  const pathname = usePathname();
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
        <p className="text-gray-600 dark:text-gray-300 mb-4">Please sign in to see your feed.</p>
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid xl:grid-cols-[220px_minmax(0,1fr)_300px] gap-6">
        {/* Left rail: shortcuts (Facebook-style) */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 space-y-1">
            <Link
              href={`/profile/${session.user.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors font-medium text-slate-800 dark:text-slate-200"
            >
              <Avatar user={{ name: session.user.name, image: (session.user as { image?: string | null }).image }} size={32} />
              <span className="truncate">{session.user.name || nav("feed")}</span>
            </Link>
            {[
              { href: "/community/groups", label: nav("groups"), img: "/champey-mark.svg" },
              { href: "/saved", label: nav("savedPosts"), Icon: Bookmark },
              { href: "/market", label: nav("market"), Icon: Store },
              { href: "/jobs", label: nav("jobs"), Icon: Briefcase },
            ].map(({ href, label, Icon, img }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-sm font-medium ${
                    active
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                      : "hover:bg-[var(--surface-2)] text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" width={26} height={26} className="rounded-lg" />
                  ) : Icon ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 dark:text-indigo-300">
                      <Icon size={16} />
                    </span>
                  ) : null}
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Center: stories, composer, posts */}
        <div className="space-y-5 min-w-0">
          <StoriesBar />
          <Composer
            onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])}
          />

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
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-[var(--surface-2)] rounded" />
                    <div className="w-2/3 h-3 bg-[var(--surface-2)] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] p-10 text-center text-gray-500 dark:text-gray-400">
              <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">Your feed is empty</p>
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
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Suggested for you</h2>
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
