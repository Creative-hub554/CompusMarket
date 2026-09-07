import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";
import { ChatWithSellerButton } from "@/components/ChatWithSellerButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sellerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sellerId } = await params;
  try {
    const { shop } = await api.products.storefront(sellerId);
    return {
      title: `${shop.name} — Shop`,
      description: `Browse everything ${shop.name} sells on Champey and ask the shop any question.`,
      alternates: { canonical: `/store/${sellerId}` },
    };
  } catch {
    return { title: "Shop" };
  }
}

export default async function StorefrontPage({ params }: Props) {
  const t = await getTranslations("shop");
  const marketT = await getTranslations("market");
  const { sellerId } = await params;

  let data: Awaited<ReturnType<typeof api.products.storefront>>;
  try {
    data = await api.products.storefront(sellerId);
  } catch {
    notFound();
  }

  const { shop, products } = data;
  const firstProduct = products[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      {/* Shop header */}
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-gold-light">
            {shop.image ? (
              <Image
                src={shop.image}
                alt={shop.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">{shop.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{shop.name}</h1>
            {shop.bio && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {shop.bio}
              </p>
            )}
            <p className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {shop.accountType === "BUSINESS" ? marketT("business") : marketT("personal")}
              {" · "}
              {t("productsCount", { count: shop.productCount })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/profile/${shop.userId}`}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-body)" }}
            >
              {marketT("visitProfile")}
            </Link>
            {firstProduct && (
              <div className="w-full sm:w-44">
                <ChatWithSellerButton
                  sellerId={shop.id}
                  productId={firstProduct.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold tracking-tight">{t("title")}</h2>
        {products.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center text-sm"
            style={{ background: "var(--surface)", borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
          >
            {t("noProducts")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                condition={product.condition}
                images={(product.images as string[]) || []}
                categoryName={(product as { category?: { name?: string } | null }).category?.name}
                sellerBadge
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
