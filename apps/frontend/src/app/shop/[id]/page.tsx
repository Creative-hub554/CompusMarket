import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { api } from "@/services/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ChatWithSellerButton } from "@/components/ChatWithSellerButton";
import { ProductTabs } from "./ProductTabs";
import { languageAlternates, getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await api.products.byId(id);
    return {
      title: product.name,
      description:
        product.description?.slice(0, 160) ||
        `Buy ${product.name} on KHMERONLINESHOP`,
      alternates: {
        canonical: `/shop/${id}`,
        languages: languageAlternates(`/shop/${id}`),
      },
      openGraph: {
        title: product.name,
        description: product.description?.slice(0, 160),
        images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const t = await getTranslations("product");
  const { id } = await params;
  let product;
  try {
    product = await api.products.byId(id);
  } catch {
    notFound();
  }

  const conditionLabels: Record<string, string> = {
    A: t("conditionA"),
    B: t("conditionB"),
    C: t("conditionC"),
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    category: product.category?.name,
    sku: product.serialNumber || product.id,
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl()}/shop/${product.id}`,
      priceCurrency: "USD",
      price: Number(product.price).toFixed(2),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition:
        product.condition === "A"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Gradient header strip */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#4338ca] text-white p-6 md:p-8 mb-8">
        <p className="text-[11px] tracking-[0.25em] text-indigo-300 uppercase font-semibold">
          {product.category.name}
        </p>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-2">
          {product.name}
        </h1>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">
            {conditionLabels[product.condition] || product.condition}
          </span>
          {product.warrantyMonths ? (
            <span className="rounded-full bg-white/15 px-3 py-1">
              {t("warrantyMonths", { months: product.warrantyMonths })}
            </span>
          ) : null}
          {product.stock > 0 ? (
            <span className="rounded-full bg-white/15 px-3 py-1">
              {t("inStock", { stock: product.stock })}
            </span>
          ) : (
            <span className="rounded-full bg-red-500/80 px-3 py-1">
              {t("outOfStock")}
            </span>
          )}
        </div>
      </div>

      {/* Gallery + buying box */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div>
          <div className="aspect-square rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                width={800}
                height={800}
                className="h-full w-full object-contain hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="text-slate-400">{t("noImage")}</div>
            )}
          </div>
        </div>

        <div className="space-y-5 animate-fade-in-up">
          <p className="text-3xl font-extrabold tracking-tight text-slate-900">
            ${Number(product.price).toLocaleString()}
          </p>

          <div className="flex flex-wrap gap-3">
            {product.stock > 0 && (
              <div className="flex-1 min-w-[200px]">
                <AddToCartButton productId={product.id} />
              </div>
            )}
            <button type="button" className="btn-primary">
              Buy now
            </button>
            {product.sellerId && (
              <div className="flex-1 min-w-[200px]">
                <ChatWithSellerButton
                  sellerId={product.sellerId}
                  productId={product.id}
                />
              </div>
            )}
          </div>

          {product.sellerId && (
            <p className="text-sm text-slate-600 flex items-center gap-1">
              {t("soldByVerified")}
            </p>
          )}

          <Link
            href={`/support/new?productId=${product.id}`}
            className="block text-center rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            {t("contactSupport")}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <ProductTabs product={product} />
    </div>
  );
}