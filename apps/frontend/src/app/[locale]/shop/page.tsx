import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse verified products from trusted Khmer sellers — electronics, fashion, home and more.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const t = await getTranslations("shop");
  const { category, q, page } = await searchParams;
  const query = typeof q === "string" ? q.trim() : undefined;
  const currentPage = Math.max(parseInt(page || "1", 10) || 1, 1);

  const [result, categories] = await Promise.all([
    api.products.browse({ category, q: query, page: currentPage, limit: PAGE_SIZE }),
    api.categories.list(),
  ]);
  const products = result.items;
  const totalPages = Math.max(Math.ceil(result.total / PAGE_SIZE), 1);
  const totalCount = categories.reduce((sum, c) => sum + c._count.products, 0);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `?${s}` : "";
  };
  const pageHref = (p: number) => `/shop${qs(p)}`;
  const clearHref = () => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">{query ? t("searchFor", { q: query }) : t("title")}</h1>
        <span className="text-sm text-slate-400">{t("productsCount", { count: result.total })}</span>
        {query && (
          <Link href={clearHref()} className="text-sm text-gold-600 hover:underline ml-auto">
            {t("clearSearch")}
          </Link>
        )}
      </div>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">{t("categories")}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link
                href="/shop"
                className={`font-medium hover:underline ${!category ? "text-gold-600" : "text-slate-600"}`}
              >
                {t("all")} ({totalCount})
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className={`transition-colors ${
                    category === cat.slug ? "text-gold-600 font-semibold" : "text-slate-600 hover:text-gold-600"
                  }`}
                >
                  {cat.name} ({cat._count.products})
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                condition={product.condition}
                images={(product.images as string[]) || []}
                categoryName={product.category?.name}
                sellerBadge={Boolean(product.sellerId)}
              />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-slate-500 text-center py-12">{t("noProducts")}</p>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              {currentPage > 1 && (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-400 transition-colors"
                >
                  &larr;
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-slate-500">
                {result.page} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-400 transition-colors"
                >
                  &rarr;
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
