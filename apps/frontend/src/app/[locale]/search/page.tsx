"use client";

import { Suspense, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useSession } from "@/lib/session-client";
import { apiFetch } from "@/lib/apiFetch";
import {
  SEARCH_TYPES,
  searchHref,
  searchSources,
  type SearchSource,
  type SearchType,
} from "@/lib/search";
import {
  SearchResults,
  type GroupHit,
  type JobHit,
  type MarketHit,
  type PageHit,
  type PersonHit,
  type SourceResults,
} from "@/components/search/SearchResults";

const TYPES = SEARCH_TYPES;

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const t = useTranslations("search");
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryParam = params.get("q") || "";
  const typeParam = TYPES.includes(params.get("type") as SearchType)
    ? (params.get("type") as SearchType)
    : "all";
  const authenticated = status === "authenticated";
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SourceResults>({});
  const [loading, setLoading] = useState(Boolean(queryParam));
  const [error, setError] = useState(false);

  useEffect(() => setQuery(queryParam), [queryParam]);

  useEffect(() => {
    const sources = searchSources(typeParam, authenticated);
    if (!queryParam || sources.length === 0) {
      setResults({});
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);
    Promise.all(
      sources.map(
        async (source) =>
          [source, await loadSource(source, queryParam)] as const,
      ),
    )
      .then((entries) => {
        if (active) setResults(Object.fromEntries(entries));
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [authenticated, queryParam, typeParam]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = query.trim();
    router.push(next ? searchHref(next, typeParam) : "/search");
  }

  const returnTo = searchHref(queryParam, typeParam);
  const hasQuery = Boolean(queryParam);
  const sources = searchSources(typeParam, authenticated);
  const resultCount = Object.values(results).reduce(
    (count, items) => count + (items?.length || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
        <form onSubmit={submit} className="relative mt-6 max-w-2xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={18}
            aria-hidden
          />
          <label htmlFor="search-page-input" className="sr-only">
            {t("inputLabel")}
          </label>
          <input
            id="search-page-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("inputPlaceholder")}
            className="input-field h-11 pl-10 pr-24"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 h-9 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-accent-dark)]"
          >
            {t("searchAction")}
          </button>
        </form>
      </header>

      <nav
        aria-label={t("typesLabel")}
        className="mb-6 flex max-w-full gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
      >
        {TYPES.map((type) => (
          <Link
            key={type}
            href={
              hasQuery ? searchHref(queryParam, type) : searchHref("", type)
            }
            aria-current={type === typeParam ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${type === typeParam ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-body)]"}`}
          >
            {t(`type${type[0].toUpperCase()}${type.slice(1)}`)}
          </Link>
        ))}
      </nav>

      {!hasQuery ? (
        <EmptyState title={t("emptyTitle")} text={t("emptyText")} />
      ) : sources.length === 0 ? (
        <EmptyState title={t("unavailableTitle")} text={t("unavailableText")} />
      ) : loading ? (
        <SearchSkeleton />
      ) : error ? (
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      ) : resultCount === 0 ? (
        <EmptyState
          title={t("noResultsTitle")}
          text={t("noResultsText", { query: queryParam })}
        />
      ) : (
        <section aria-labelledby="search-results-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="search-results-heading"
              className="text-sm text-[var(--text-muted)]"
            >
              {t("resultsCount", { count: resultCount })}
            </h2>
            {typeParam === "market" && (
              <Link
                href={`/market?q=${encodeURIComponent(queryParam)}`}
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                {t("openMarket")}
              </Link>
            )}
          </div>
          <SearchResults results={results} returnTo={returnTo} t={t} />
        </section>
      )}
    </div>
  );
}

async function loadSource(
  source: SearchSource,
  query: string,
): Promise<unknown[]> {
  const encoded = encodeURIComponent(query);
  switch (source) {
    case "market": {
      const data = await apiFetch<{ hits?: MarketHit[] }>(
        `/api/search?q=${encoded}`,
      );
      return data.hits || [];
    }
    case "people": {
      const data = await apiFetch<PersonHit[]>(`/api/people?q=${encoded}`);
      return Array.isArray(data) ? data : [];
    }
    case "jobs": {
      const data = await apiFetch<JobHit[]>(`/api/jobs?q=${encoded}`);
      return Array.isArray(data) ? data : [];
    }
    case "pages": {
      const data = await apiFetch<{ items?: PageHit[] }>(
        `/api/pages?q=${encoded}`,
      );
      return data.items || [];
    }
    case "groups": {
      const data = await apiFetch<{ items?: GroupHit[] }>(
        `/api/groups?q=${encoded}`,
      );
      return data.items || [];
    }
  }
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-10 text-center">
      <h2 className="font-semibold text-[var(--text-body)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{text}</p>
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse rounded-xl bg-[var(--surface-2)]"
        />
      ))}
    </div>
  );
}
