"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/apiFetch";

type SellerProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  condition: "A" | "B" | "C";
  status: string;
  stock: number;
  images: string[];
  category: { id: string; name: string };
  createdAt: string;
};

export default function SellerProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [maxProducts, setMaxProducts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    apiFetch<{ products: SellerProduct[]; maxProducts: number }>("/api/seller/products")
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
          setMaxProducts(data.maxProducts);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (!session) {
    return <RequireAuth className="max-w-3xl mx-auto px-4 py-12" />;
  }

  const toggleStatus = async (product: SellerProduct) => {
    const nextStatus = product.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setError("");
    try {
      await apiFetch(`/api/seller/products/${product.id}`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <button
          onClick={() => router.push("/seller/products/new")}
          disabled={products.length >= maxProducts}
          className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-gold-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Product
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {products.length} / {maxProducts} product slots used
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-8">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-[var(--surface-2)]">
          <p className="text-slate-600 dark:text-slate-300 mb-4">You have no products yet.</p>
          <button
            onClick={() => router.push("/seller/products/new")}
            className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-gold-700 transition-colors"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 border rounded-lg p-4 bg-[var(--surface)]"
            >
              {product.images?.[0] ? (
                <Image
                  src={product.images[0]}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded object-contain bg-[var(--surface-2)]"
                />
              ) : (
                <div className="h-16 w-16 rounded bg-[var(--surface-2)]" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      product.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : product.status === "DISABLED"
                          ? "bg-[var(--surface-2)] text-slate-500 dark:text-slate-400"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {product.category.name}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  ${Number(product.price).toLocaleString()} · Stock:{" "}
                  {product.stock}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/seller/products/${product.id}/edit`}
                  className="text-gold-600 text-sm font-medium hover:underline text-center"
                >
                  Edit
                </Link>
                <button
                  onClick={() => toggleStatus(product)}
                  className={`text-sm font-medium hover:underline ${
                    product.status === "ACTIVE"
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {product.status === "ACTIVE" ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
