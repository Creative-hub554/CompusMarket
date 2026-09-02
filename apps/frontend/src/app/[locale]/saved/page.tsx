"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PostCard, type FeedPost } from "@/components/social/PostCard";

export default function SavedPage() {
  const t = useTranslations("saved");
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cursor?: string) => {
    const res = await fetch(`/api/posts/bookmarks${cursor ? `?cursor=${cursor}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setPosts((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user) load();
    else if (status === "unauthenticated") setLoading(false);
  }, [session?.user, status, load]);

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">
          {t("title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{t("signInRequired")}</p>
        <Link href="/login" className="btn-primary no-underline">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-subtitle mb-6">{t("subtitle")}</p>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 card rounded-2xl">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t("empty")}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("emptyText")}</p>
          <Link href="/feed" className="btn-primary no-underline mt-5 inline-block">
            {t("browseFeed")}
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} onEdited={(updated) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))} />
            ))}
          </div>
          {nextCursor && (
            <div className="text-center pt-4">
              <button onClick={() => load(nextCursor)} className="btn-ghost">
                {t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
