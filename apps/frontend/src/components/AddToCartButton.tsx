"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart";

export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  async function handleAdd() {
    setLoading(true);
    try {
      await addItem(productId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      alert("Please log in to add items to cart");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className={`w-full rounded-lg py-3 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
        added
          ? "bg-green-600 hover:bg-green-700"
          : "bg-khmer-red hover:bg-khmer-red-light"
      } disabled:opacity-50`}
    >
      {loading ? (
        <span className="inline-block animate-pulse">Adding...</span>
      ) : added ? (
        <span className="inline-flex items-center gap-1">Added to Cart!</span>
      ) : (
        "Add to Cart"
      )}
    </button>
  );
}
