import type { Product } from "@/services/api";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

type Props = { product: Product };

const conditionColors: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-orange-100 text-orange-800",
};

export async function ProductCard({ product }: Props) {
  const t = await getTranslations("product");
  const conditionLabels: Record<string, string> = {
    A: t("conditionA"),
    B: t("conditionB"),
    C: t("conditionC"),
  };
  const images = product.images as string[];
  return (
    <Link
      href={`/shop/${product.id}`}
      className="card-hover group block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-indigo-300"
    >
      <div className="aspect-square w-full bg-slate-50 flex items-center justify-center overflow-hidden">
        {images?.[0] ? (
          <Image
            src={images[0]}
            alt={product.name}
            width={500}
            height={500}
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <svg
            className="h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-xs text-slate-500">{product.category.name}</p>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${conditionColors[product.condition] || "bg-slate-100"}`}
          >
            {conditionLabels[product.condition] || product.condition}
          </span>
          {product.sellerId && (
            <span className="text-xs text-slate-900">{t("seller")}</span>
          )}
        </div>
        <p className="text-lg font-bold text-slate-900">
          ${Number(product.price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
