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
      className="group block rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="aspect-square w-full flex items-center justify-center overflow-hidden" style={{ background: "var(--surface-2)" }}>
        {images?.[0] ? (
          <Image
            src={images[0]}
            alt={name}
            width={500}
            height={500}
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <svg
            className="h-14 w-14 text-slate-300 dark:text-slate-600"
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

      <div className="p-3.5 space-y-1.5">
        <h3
          className="font-semibold truncate text-sm leading-snug"
          style={{ color: "var(--text-body)" }}
        >
          {name}
        </h3>
        {categoryName && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {categoryName}
          </p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${conditionColors[condition] || ""}`}
          >
            {conditionLabels[condition] || condition}
          </span>
          {sellerBadge && (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {t("seller")}
            </span>
          )}
        </div>
        <p className="text-base font-extrabold bg-gradient-to-r from-gold-600 to-gold-500 bg-clip-text text-transparent dark:from-gold-400 dark:to-gold-300 pt-0.5">
          ${Number(price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
