"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, handleApiError } from "@/lib/apiFetch";
import { useTranslations } from "next-intl";
import { BadgeCheck, MessageCircle, Phone, Settings, Store, ThumbsUp } from "lucide-react";
import { Composer } from "@/components/social/Composer";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FollowPageButton } from "@/components/social/FollowPageButton";
import { apiFetch as fetchJson } from "@/lib/apiFetch";

type PageProfile = {
  id: string;
  name: string;
  username: string;
  category: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  phone: string | null;
  followerCount: number;
  postCount: number;
  verified: boolean;
  isFollowing: boolean;
  viewerRole: "OWNER" | "EDITOR" | null;
};

type PageProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  condition: string;
  images: string[];
  stock: number;
};

const INTERSPERSE_EVERY = 3;

export function PageProfileView({ username }: { username: string }) {
  const t = useTranslations("pages");
  const { data: session } = useSession();
  const meId = session?.user?.id;

  const [page, setPage] = useState<PageProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"posts" | "shop">("posts");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [products, setProducts] = useState<PageProduct[] | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<PageProfile>(`/api/pages/username/${username}`)
      .then((data) => {
        if (cancelled) return;
        setPage(data);
        setLoadingPosts(true);
        fetchJson<{ items: FeedPost[]; nextCursor: string | null }>(`/api/pages/${data.id}/posts`)
          .then((d) => {
            setPosts(d.items);
            setCursor(d.nextCursor);
            setHasMore(!!d.nextCursor);
          })
          .catch(() => undefined)
          .finally(() => setLoadingPosts(false));
      })
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [username]);

  const loadMore = useCallback(async () => {
    if (!page || !cursor) return;
    try {
      const data = await apiFetch<{ items: FeedPost[]; nextCursor: string | null }>(
        `/api/pages/${page.id}/posts?cursor=${cursor}`
      );
      setPosts((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      await handleApiError(err, "load more posts", true);
      setHasMore(false);
    }
  }, [page, cursor]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingPosts) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingPosts, loadMore]);

  // Shop products load lazily when the tab opens.
  useEffect(() => {
    if (tab !== "shop" || !page || products) return;
    fetchJson<{ items: PageProduct[]; verified: boolean }>(`/api/pages/${page.id}/products`)
      .then((d) => setProducts(d.items))
      .catch(() => setProducts([]));
  }, [tab, page, products]);

  async function openChat() {
    if (!page) return;
    setOpeningChat(true);
    try {
      const { id } = await apiFetch<{ id: string }>(`/api/pages/${page.id}/messages`, {
        method: "POST",
      });
      window.location.href = `/messages/${id}`;
    } catch (err) {
      await handleApiError(err, "open chat", true);
    }
    setOpeningChat(false);
  }

  async function togglePin(postId: string, pinned: boolean) {
    if (!page) return;
    try {
      await apiFetch(`/api/pages/${page.id}/posts/${postId}/pin`, {
        method: "PATCH",
        body: { pinned },
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, pinned } : p))
      );
    } catch (err) {
      await handleApiError(err, "pin post", true);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{t("notFound")}</p>
        <Link href="/pages" className="btn-ghost mt-4 inline-block no-underline">
          {t("backToPages")}
        </Link>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-40 rounded-2xl animate-shimmer mb-4" />
        <div className="h-20 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  const isStaff = page.viewerRole === "OWNER" || page.viewerRole === "EDITOR";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-fade-in">
      {/* cover + identity */}
      <div className="card rounded-2xl overflow-hidden">
        <div
          className="h-40 bg-gradient-to-br from-gold-500/30 to-gold-300/30 bg-cover bg-center"
          style={page.coverImage ? { backgroundImage: `url(${page.coverImage})` } : undefined}
        />
        <div className="p-5 pt-0">
          <div className="flex items-end gap-4 -mt-8 mb-3">
            <span className="shrink-0 h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gold to-gold-light flex items-center justify-center font-bold text-white text-3xl ring-4 ring-[var(--surface)]">
              {page.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.image} alt="" className="h-full w-full object-cover" />
              ) : (
                page.name.charAt(0).toUpperCase()
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold inline-flex items-center gap-1.5">
                {page.name}
                {page.verified && <BadgeCheck size={18} className="text-gold-500" aria-label={t("verified")} />}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                @{page.username} · {page.category}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {page.followerCount} {t("followers")} · {page.postCount} {t("posts")}
              </p>
              {page.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{page.description}</p>
              )}
              {page.phone && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1.5">
                  <Phone size={14} /> {page.phone}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {meId && !isStaff && page.viewerRole === null && (
                <FollowPageButton
                  pageId={page.id}
                  initialFollowing={page.isFollowing}
                  onChange={(following, followerCount) =>
                    setPage((p) => (p ? { ...p, isFollowing: following, followerCount } : p))
                  }
                />
              )}
              {meId && !isStaff && (
                <button onClick={openChat} disabled={openingChat} className="btn-ghost inline-flex items-center gap-1.5">
                  <MessageCircle size={15} />
                  {t("message")}
                </button>
              )}
              {isStaff && (
                <Link href={`/pages/manage/${page.id}`} className="btn-ghost inline-flex items-center gap-1.5 no-underline">
                  <Settings size={15} />
                  {t("manage")}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "posts" ? "text-gold-600 dark:text-gold-400 border-b-2 border-gold-500" : "text-slate-500"
            }`}
          >
            {t("tabPosts")}
          </button>
          <button
            onClick={() => setTab("shop")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
              tab === "shop" ? "text-gold-600 dark:text-gold-400 border-b-2 border-gold-500" : "text-slate-500"
            }`}
          >
            <Store size={15} />
            {t("tabShop")}
          </button>
        </div>
      </div>

      {tab === "posts" ? (
        <div className="mt-5 space-y-5">
          {isStaff && (
            <ErrorBoundary label="composer" fallback={() => null}>
              <Composer
                pageId={page.id}
                onPosted={(post) => setPosts((prev) => [post as FeedPost, ...prev])}
              />
            </ErrorBoundary>
          )}
          {loadingPosts ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl animate-shimmer" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="card rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400">
              <ThumbsUp size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">{t("noPosts")}</p>
              <p className="text-sm">{t("noPostsText")}</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <Fragment key={post.id}>
                  <ErrorBoundary label={`post ${post.id}`} fallback={() => null}>
                    <PostCard
                      post={post}
                      onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                      onEdited={(updated) =>
                        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                      }
                      onTogglePin={isStaff ? (pinned) => togglePin(post.id, pinned) : undefined}
                      pageViewerRole={page.viewerRole}
                    />
                  </ErrorBoundary>
                </Fragment>
              ))}
              <div ref={sentinelRef} />
              {!hasMore && posts.length > 0 && (
                <p className="text-center text-slate-400 text-sm py-4">{t("caughtUp")}</p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-5">
          {products === null ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl animate-shimmer" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400">
              <Store size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">{t("shopEmpty")}</p>
              <p className="text-sm">{t("shopEmptyText")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/${p.id}`}
                  className="card rounded-2xl overflow-hidden no-underline block"
                >
                  <span className="block h-36 bg-[var(--surface-2)]">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="block p-3">
                    <span className="block text-sm font-semibold truncate">{p.name}</span>
                    <span className="block text-sm font-bold text-gold-600 dark:text-gold-400 mt-1">
                      ${Number(p.price).toFixed(2)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
