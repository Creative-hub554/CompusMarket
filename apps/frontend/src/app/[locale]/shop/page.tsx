import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { filterProductsByCategory } from "@/lib/shopFilter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse verified products from trusted Khmer sellers — electronics, fashion, home and more.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const t = await getTranslations("shop");
  const { category } = await searchParams;
  const [allProducts, categories] = await Promise.all([
    api.products.list(),
    api.categories.list(),
  ]);
  const products = filterProductsByCategory(allProducts, categories, category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">{t("title")}</h1>
        <span className="text-sm text-slate-400">{t("productsCount", { count: products.length })}</span>
      </div>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">{t("categories")}</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link
                href="/shop"
                className={`font-medium hover:underline ${!category ? "text-indigo-600" : "text-slate-600"}`}
              >
                {t("all")} ({allProducts.length})
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className={`transition-colors ${
                    category === cat.slug ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-indigo-600"
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-slate-500 text-center py-12">{t("noProducts")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
