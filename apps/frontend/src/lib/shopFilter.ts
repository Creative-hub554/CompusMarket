import type { Product, Category } from "@/services/api";

export function filterProductsByCategory(
  products: Product[],
  categories: Category[],
  slug: string | undefined
): Product[] {
  if (!slug) return products;
  const category = categories.find((c) => c.slug === slug);
  if (!category) return [];
  return products.filter((p) => p.category.id === category.id);
}
