"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useSession } from "@/lib/session-client";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";

type Person = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  _count: { followers: number };
};

export default function PeoplePage() {
  const t = useTranslations("people");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const isSearch = Boolean(query.trim());
        const endpoint = isSearch
          ? `/api/people?q=${encodeURIComponent(query.trim())}`
          : "/api/people/directory?limit=20";
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error("people request failed");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setPeople(isSearch ? (Array.isArray(data) ? data : []) : (data.items ?? []));
          setNextCursor(isSearch ? null : (data.nextCursor ?? null));
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setPeople([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [status, query]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/people/directory?limit=20&cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error("people request failed");
      const data = await response.json();
      if (queryRef.current.trim()) return;
      setPeople((current) => [...current, ...(Array.isArray(data.items) ? data.items : [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error(t("errorText"));
    } finally {
      setLoadingMore(false);
    }
  }

  async function messagePerson(personId: string) {
    if (messagingId) return;
    setMessagingId(personId);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: personId }),
      });
      if (!response.ok) {
        toast.error(t("messageFailed"));
        return;
      }
      const thread = await response.json();
      if (!thread?.id) {
        toast.error(t("messageFailed"));
        return;
      }
      router.push(`/messages/${thread.id}`);
    } catch {
      toast.error(t("messageFailed"));
    } finally {
      setMessagingId(null);
    }
  }
  if (status === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-[var(--text-muted)]">{t("loading")}</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-body)]">{t("title")}</h1>
        <p className="mt-2 text-[var(--text-muted)]">{t("signInHint")}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-gold-600 px-5 py-2.5 font-semibold text-white hover:bg-gold-700">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600 dark:text-gold-300">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-body)]">{t("title")}</h1>
        <p className="mt-2 max-w-xl text-[var(--text-muted)]">{t("subtitle")}</p>
        <label className="mt-5 block max-w-xl">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-body)] outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
          />
        </label>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <h2 className="font-semibold text-red-800 dark:text-red-200">{t("errorTitle")}</h2>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{t("errorText")}</p>
        </section>
      ) : people.length === 0 ? (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-10 text-center">
          <h2 className="font-semibold text-[var(--text-body)]">{query.trim() ? t("noMatchesTitle") : t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{query.trim() ? t("noMatchesText") : t("emptyText")}</p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <article key={person.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Link href={`/profile/${person.id}`} aria-label={person.name || person.username || t("personFallback")}>
                  <Avatar user={person} size={52} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${person.id}`} className="block truncate font-semibold text-[var(--text-body)] hover:underline">
                    {person.name || person.username || t("personFallback")}
                  </Link>
                  {person.username && <p className="truncate text-sm text-[var(--text-muted)]">@{person.username}</p>}
                </div>
              </div>
              {person.bio && <p className="mt-4 line-clamp-2 text-sm text-[var(--text-muted)]">{person.bio}</p>}
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">{t("followers", { count: person._count.followers })}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] hover:border-gold-500 hover:text-gold-600 disabled:opacity-50"
                  onClick={() => messagePerson(person.id)}
                  disabled={messagingId !== null}
                  aria-busy={messagingId === person.id}
                >
                  <MessageCircle size={14} />
                  {messagingId === person.id ? t("messaging") : t("message")}
                </button>
                <FollowButton userId={person.id} initialFollowing={false} size="sm" />
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && !query.trim() && nextCursor && people.length > 0 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-[var(--border-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--text-body)] hover:border-gold-500 disabled:opacity-50"
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        </div>
      )}
    </main>
  );
}
