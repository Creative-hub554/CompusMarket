import Link from "next/link";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const articles = await api.articles.list();

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
      <p className="text-gray-600 mb-8">
        Free guides and tips to help you advance your career.
      </p>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">Categories</h2>
          <ul className="space-y-1 text-sm">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/community/careers?cat=${cat.id}`}
                  className="text-gray-600 hover:text-blue-600"
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          {articles.length === 0 ? (
            <div className="space-y-6">
              {[
                {
                  title: "How to Write a Great Resume",
                  excerpt:
                    "Learn the key elements of a standout resume that gets noticed by employers in Cambodia.",
                  category: "Resume Examples",
                },
                {
                  title: "Common Interview Questions & Answers",
                  excerpt:
                    "Prepare for your next interview with these commonly asked questions and expert tips.",
                  category: "Interview Tips",
                },
                {
                  title: "Career Planning Guide for Students",
                  excerpt:
                    "A step-by-step guide for Cambodian students planning their career path.",
                  category: "Career Guides",
                },
              ].map((article, i) => (
                <article
                  key={i}
                  className="rounded-lg border p-6 hover:shadow-md transition"
                >
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    {article.category}
                  </p>
                  <h2 className="text-lg font-semibold mt-1">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 text-sm mt-2">
                    {article.excerpt}
                  </p>
                </article>
              ))}
            </div>
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
                    <p className="text-gray-600 text-sm mt-2">
                      {article.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
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
