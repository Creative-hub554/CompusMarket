import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";
import type { Article as ApiArticle } from "@/services/api";
import { filterArticlesByCategory } from "@/lib/articleFilter";

export const dynamic = "force-dynamic";

export default async function CareersPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const t = await getTranslations("careers");
  const { cat } = await searchParams;
  const allArticles = await api.articles.list();
  const articles = filterArticlesByCategory(
    allArticles.map((article) => ({
      ...article,
      categorySlug: article.category,
    })),
    cat
  ) as unknown as ApiArticle[];

  const categories = [
    { id: "CAREER_GUIDE", label: "Career Guides" },
    { id: "INTERVIEW_TIPS", label: "Interview Tips" },
    { id: "RESUME_EXAMPLES", label: "Resume Examples" },
    { id: "JOB_SEARCH", label: "Job Search" },
    { id: "COMPUTER_LITERACY", label: "Computer Literacy" },
    { id: "WORKPLACE_COMMUNICATION", label: "Workplace Communication" },
    { id: "PRODUCTIVITY", label: "Productivity" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Career Resources</h1>
      <p className="text-slate-600 mb-8">
        Free guides and tips to help you advance your career.
      </p>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">Categories</h2>
          <ul className="space-y-1 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/community/careers?cat=${category.id}`}
                  className={`transition-colors ${
                    cat === category.id
                      ? "text-indigo-600 font-semibold"
                      : "text-slate-600 hover:text-indigo-600"
                  }`}
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          {articles.length === 0 ? (
            <p className="text-slate-500 text-center py-16">
              {t("noArticles")}
            </p>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/community/careers/${article.slug}`}
                  className="block rounded-lg border p-6 hover:shadow-md transition"
                >
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    {article.category.replace(/_/g, " ")}
                  </p>
                  <h2 className="text-lg font-semibold mt-1">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="text-slate-600 text-sm mt-2">
                      {article.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
