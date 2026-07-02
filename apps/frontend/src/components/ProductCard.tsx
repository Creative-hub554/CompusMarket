import type { Product } from "@/services/api";
import Link from "next/link";

type Props = { product: Product };

const conditionLabels: Record<string, string> = {
  A: "Like New",
  B: "Good",
  C: "Fair",
};

export function ProductCard({ product }: Props) {
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group block rounded-lg border p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square w-full rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="font-medium text-sm truncate">{product.name}</h3>
        <p className="text-xs text-gray-500">{product.category.name}</p>
        <p className="text-xs text-gray-400">
          Condition: {conditionLabels[product.condition] || product.condition}
        </p>
        <p className="text-lg font-bold">
          ${Number(product.price).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
