import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type ProductCardProps = {
  id: string;
  name: string;
  price: number | string;
  condition: string;
  images: string[];
  categoryName?: string;
  sellerBadge?: boolean;
};

const conditionColors: Record<string, string> = {
  A: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  C: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
};

export function ProductCard({
  id,
  name,
  price,
  condition,
  images,
  categoryName,
  sellerBadge,
}: ProductCardProps) {
  const t = useTranslations("product");
  const conditionLabels: Record<string, string> = {
    A: t("conditionA"),
    B: t("conditionB"),
    C: t("conditionC"),
  };

  return (
    <Link
      href={`/shop/${id}`}
      className="card-hover group block rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden hover:border-indigo-400/60"
    >
      <div className="aspect-square w-full bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
        {images?.[0] ? (
          <Image
            src={images[0]}
            alt={name}
            width={500}
            height={500}
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <svg
            className="h-12 w-12 text-slate-300 dark:text-slate-600"
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
        <h3 className="font-semibold truncate text-slate-900 dark:text-slate-100">{name}</h3>
        {categoryName && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{categoryName}</p>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${conditionColors[condition] || "bg-slate-100 dark:bg-slate-800"}`}
          >
            {conditionLabels[condition] || condition}
          </span>
          {sellerBadge && (
            <span className="text-xs text-slate-700 dark:text-slate-300">{t("seller")}</span>
          )}
        </div>
        <p className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
          ${Number(price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
