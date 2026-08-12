import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ChatWithSellerButton } from "@/components/ChatWithSellerButton";
import { ProductTabs } from "./ProductTabs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
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
              <img
                src={product.images[0]}
                alt={product.name}
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