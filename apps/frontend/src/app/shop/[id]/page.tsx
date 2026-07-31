import Link from "next/link";
import { api } from "@/services/api";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ChatWithSellerButton } from "@/components/ChatWithSellerButton";

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

  const reviews = product.reviews || [];
  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-contain hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-gray-400">No image</div>
          )}
        </div>

        <div className="space-y-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold gold-underline">{product.name}</h1>
            <p className="text-sm text-gray-500 mt-3">{product.category.name}</p>
          </div>

          <p className="text-4xl font-bold text-khmer-red">
            ${Number(product.price).toLocaleString()}
          </p>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-800 font-medium">
              {conditionLabels[product.condition] || product.condition}
            </span>
            {product.warrantyMonths && (
              <span className="rounded-full bg-khmer-blue/10 px-3 py-1 text-khmer-blue font-medium">
                {product.warrantyMonths}mo warranty
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                product.stock > 0
                  ? "bg-gray-100 text-gray-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
            </span>
          </div>

          {product.sellerId && (
            <p className="text-sm text-khmer-blue flex items-center gap-1">
              Sold by a verified seller
            </p>
          )}

          <div>
            <h2 className="font-semibold mb-1">Description</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          </div>

          {product.serialNumber && (
            <p className="text-xs text-gray-400">
              Serial: {product.serialNumber}
            </p>
          )}

          <div className="space-y-2 pt-2">
            {product.stock > 0 && <AddToCartButton productId={product.id} />}
            {product.sellerId && (
              <ChatWithSellerButton sellerId={product.sellerId} productId={product.id} />
            )}
            <Link href={`/support/new?productId=${product.id}`} className="block text-center rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">Customer Reviews</h2>
          {reviews.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-yellow-500">
              <span className="text-base">{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</span>
              <span className="text-gray-600 font-medium">{average.toFixed(1)}</span>
              <span className="text-gray-400">({reviews.length})</span>
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-yellow-500">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                    <span className="text-sm font-medium">
                      {review.user.name || "Customer"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-700">{review.comment}</p>
                )}
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {review.images.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-14 h-14 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
