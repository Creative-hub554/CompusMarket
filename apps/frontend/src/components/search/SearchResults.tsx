import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Avatar } from "@/components/social/Avatar";
import { withSearchReturnTo, type SearchSource } from "@/lib/search";

export type MarketHit = {
  id: string;
  name: string;
  price: number;
  condition: string;
  categoryName: string;
  images: string[];
};
export type PersonHit = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
};
export type JobHit = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
};
export type PageHit = {
  id: string;
  name: string;
  username: string;
  category: string;
  description: string | null;
  image: string | null;
  verified: boolean;
};
export type GroupHit = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  privacy: "PUBLIC" | "PRIVATE";
};
export type SourceResults = Partial<Record<SearchSource, unknown[]>>;

type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function SearchResults({
  results,
  returnTo,
  t,
}: {
  results: SourceResults;
  returnTo: string;
  t: Translator;
}) {
  return (
    <div className="space-y-8">
      {Boolean(results.market?.length) && (
        <ResultSection title={t("typeMarket")}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {(results.market as MarketHit[]).map((hit) => (
              <ProductCard
                key={hit.id}
                {...hit}
                returnTo={returnTo}
                sellerBadge
              />
            ))}
          </div>
        </ResultSection>
      )}
      {Boolean(results.people?.length) && (
        <ResultSection title={t("typePeople")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(results.people as PersonHit[]).map((person) => (
              <Link
                key={person.id}
                href={withSearchReturnTo(`/profile/${person.id}`, returnTo)}
                className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-[var(--color-accent)]"
              >
                <Avatar user={person} size={40} />
                <span className="min-w-0">
                  <strong className="block truncate">
                    {person.name || person.username || t("personFallback")}
                  </strong>
                  <span className="block truncate text-sm text-[var(--text-muted)]">
                    {person.bio ||
                      (person.username ? `@${person.username}` : "")}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </ResultSection>
      )}
      {Boolean(results.jobs?.length) && (
        <ResultSection title={t("typeJobs")}>
          <div className="space-y-3">
            {(results.jobs as JobHit[]).map((job) => (
              <Link
                key={job.id}
                href={withSearchReturnTo(`/jobs/${job.id}`, returnTo)}
                className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-[var(--color-accent)]"
              >
                <strong className="block">{job.title}</strong>
                <span className="text-sm text-[var(--text-muted)]">
                  {job.company} · {job.location} · {job.type.replace("_", " ")}
                </span>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                  {job.description}
                </p>
              </Link>
            ))}
          </div>
        </ResultSection>
      )}
      {Boolean(results.pages?.length) && (
        <ResultSection title={t("typePages")}>
          <div className="space-y-3">
            {(results.pages as PageHit[]).map((page) => (
              <Link
                key={page.id}
                href={withSearchReturnTo(`/pages/${page.username}`, returnTo)}
                className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-[var(--color-accent)]"
              >
                <strong className="block">{page.name}</strong>
                <span className="text-sm text-[var(--text-muted)]">
                  {page.category}
                  {page.description ? ` · ${page.description}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </ResultSection>
      )}
      {Boolean(results.groups?.length) && (
        <ResultSection title={t("typeGroups")}>
          <div className="space-y-3">
            {(results.groups as GroupHit[]).map((group) => (
              <Link
                key={group.id}
                href={withSearchReturnTo(
                  `/community/groups/${group.id}`,
                  returnTo,
                )}
                className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-[var(--color-accent)]"
              >
                <strong className="block">{group.name}</strong>
                <span className="text-sm text-[var(--text-muted)]">
                  {group.privacy === "PRIVATE" ? t("private") : t("public")} ·{" "}
                  {group.memberCount} {t("members")}
                </span>
                {group.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                    {group.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`results-${title}`}>
      <h3 id={`results-${title}`} className="mb-3 text-lg font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
