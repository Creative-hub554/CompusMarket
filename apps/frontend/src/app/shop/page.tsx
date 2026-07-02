import Link from "next/link";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    api.products.list(),
    api.categories.list(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shop</h1>

      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <h2 className="font-semibold mb-3">Categories</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/shop" className="text-blue-600 hover:underline">
                All ({products.length})
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="text-gray-600 hover:text-blue-600"
                >
                  {cat.name} ({cat._count.products})
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-gray-500 text-center py-12">
              No products available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
