import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";

export default async function AdminArticlesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const articles = await api.articles.all();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          New Article
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{article.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  {article.category.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <span className={article.published ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-700" : "rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700"}>
                    {article.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(article.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {articles.length === 0 && (
          <p className="p-4 text-gray-500 text-center">No articles yet.</p>
        )}
      </div>
    </div>
  );
}
