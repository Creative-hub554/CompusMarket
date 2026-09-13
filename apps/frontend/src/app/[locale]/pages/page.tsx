"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { apiFetch } from "@/lib/apiFetch";
import { useTranslations } from "next-intl";
import { BadgeCheck, Plus, Search, Store } from "lucide-react";

type PageSummary = {
  id: string;
  name: string;
  username: string;
  category: string;
  description: string | null;
  image: string | null;
  followerCount: number;
  postCount: number;
  verified: boolean;
  isFollowing: boolean;
};

export default function PagesDirectoryPage() {
  const t = useTranslations("pages");
  const { data: session } = useSession();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string, q?: string, cat?: string | null) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      try {
        const data = await apiFetch<{ items: PageSummary[]; nextCursor: string | null }>(
          `/api/pages?${params.toString()}`
        );
        setPages((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch {
        /* keep current list on failure */
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handle = setTimeout(
      () => load(undefined, search.trim() || undefined, category),
      search ? 300 : 0
    );
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </div>
        {session?.user && (
          <Link href="/pages/new" className="btn-primary inline-flex items-center gap-1.5 shrink-0 no-underline">
            <Plus size={16} />
            {t("create")}
          </Link>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="input-field !rounded-full !pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 card rounded-2xl">
          <Store size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t("empty")}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("emptyText")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/pages/${page.username}`}
              className="card rounded-2xl p-5 flex items-center gap-4 no-underline block"
            >
              {/* avatar */}
              <span className="shrink-0 h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-gold to-gold-light flex items-center justify-center font-bold text-white text-xl">
                {page.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  page.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                  {page.name}
                  {page.verified && <BadgeCheck size={15} className="text-gold-500" aria-label={t("verified")} />}
                </span>
                <span className="block text-sm text-slate-500 dark:text-slate-400 truncate">
                  {page.category}
                  {page.description ? ` · ${page.description}` : ""}
                </span>
                <span className="block text-xs text-slate-400 mt-1">
                  {page.followerCount} {t("followers")} · {page.postCount} {t("posts")}
                </span>
              </span>
            </Link>
          ))}
          {nextCursor && (
            <div className="text-center pt-2">
              <button onClick={() => load(nextCursor, search.trim() || undefined, category)} className="btn-ghost">
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
