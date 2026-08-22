import type { Metadata } from "next";
import { api } from "@/services/api";
import { notFound } from "next/navigation";
import { languageAlternates } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await api.articles.bySlug(slug);
    return {
      title: article.title,
      description: article.excerpt || article.content?.slice(0, 160),
      alternates: {
        canonical: `/community/careers/${slug}`,
        languages: languageAlternates(`/community/careers/${slug}`),
      },
      openGraph: {
        title: article.title,
        description: article.excerpt || article.content?.slice(0, 160),
        type: "article",
        publishedTime: article.createdAt,
      },
    };
  } catch {
    return { title: "Article" };
  }
}

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
      <p className="text-sm text-indigo-600 font-medium uppercase tracking-wide">
        {article.category.replace(/_/g, " ")}
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-4">{article.title}</h1>
      <p className="text-sm text-slate-400 mb-8">
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
