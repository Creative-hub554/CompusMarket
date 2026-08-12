export type Article = {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  excerpt?: string;
};

export function filterArticlesByCategory(
  articles: Article[],
  slug: string | undefined
): Article[] {
  if (!slug) return articles;
  return articles.filter((a) => a.categorySlug === slug);
}
