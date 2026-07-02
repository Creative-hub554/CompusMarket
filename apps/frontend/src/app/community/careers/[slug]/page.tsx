import { api } from "@/services/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  let article;

  try {
    article = await api.articles.bySlug(slug);
  } catch {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">
        {article.category.replace(/_/g, " ")}
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-4">{article.title}</h1>
      <p className="text-sm text-gray-400 mb-8">
        {article.author?.name && `By ${article.author.name} · `}
        {new Date(article.createdAt).toLocaleDateString()}
      </p>

      <div className="prose prose-gray max-w-none">
        {article.content.split("\n").map((paragraph, i) => (
          <p key={i} className="mb-4 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
