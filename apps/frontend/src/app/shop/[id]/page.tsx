import { api } from "@/services/api";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const conditionLabels: Record<string, string> = {
  A: "Like New",
  B: "Good",
  C: "Fair",
};

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  let product;
  try {
    product = await api.products.byId(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-gray-400">No image</div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-gray-500">{product.category.name}</p>

          <p className="text-3xl font-bold">
            ${Number(product.price).toLocaleString()}
          </p>

          <div className="flex gap-2 text-sm">
            <span className="rounded bg-green-100 px-2 py-1 text-green-800">
              {conditionLabels[product.condition] || product.condition}
            </span>
            {product.warrantyMonths && (
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                {product.warrantyMonths}mo warranty
              </span>
            )}
            <span
              className={`rounded px-2 py-1 ${
                product.stock > 0
                  ? "bg-gray-100 text-gray-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
            </span>
          </div>

          <div>
            <h2 className="font-semibold mb-1">Description</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          {product.serialNumber && (
            <p className="text-xs text-gray-400">
              Serial: {product.serialNumber}
            </p>
          )}

          <button className="w-full rounded-lg bg-blue-600 py-3 text-white font-medium hover:bg-blue-700 transition">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
