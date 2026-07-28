import type { Product } from "@/services/api";
import Link from "next/link";

type Props = { product: Product };

const conditionLabels: Record<string, string> = {
  A: "Like New",
  B: "Good",
  C: "Fair",
};

const conditionColors: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-khmer-gold/20 text-khmer-gold",
  C: "bg-orange-100 text-orange-800",
};

export function ProductCard({ product }: Props) {
  const images = product.images as string[];
  return (
    <Link
      href={`/shop/${product.id}`}
      className="card-hover group block rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm"
    >
      <div className="aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        {images?.[0] ? (
          <img
            src={images[0]}
            alt={product.name}
            className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-xs text-gray-500">{product.category.name}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conditionColors[product.condition] || "bg-gray-100"}`}>
            {conditionLabels[product.condition] || product.condition}
          </span>
          {product.sellerId && (
            <span className="text-xs text-khmer-blue">Seller</span>
          )}
        </div>
        <p className="text-lg font-bold text-khmer-red">
          ${Number(product.price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
