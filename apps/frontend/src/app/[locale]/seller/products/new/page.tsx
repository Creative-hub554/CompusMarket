"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";

export default function SellerNewProductPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("A");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState("1");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [productCount, setProductCount] = useState(0);
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);

    fetch("/api/seller/apply")
      .then((r) => r.json())
      .then((data) => {
        if (data?.id && data.verificationStatus === "APPROVED") {
          setProductCount(data._count?.products || 0);
          setAccountType(data.accountType);
        }
      });
  }, []);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <Link
          href="/login"
          className="text-gold-600 font-medium hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const maxProducts = accountType === "BUSINESS" ? 10 : 5;
  if (productCount >= maxProducts) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Limit Reached</h1>
        <p className="text-slate-600">
          You have used all {maxProducts} product slots. Products can only be
          disabled, not deleted.
        </p>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) {
      setError("Maximum 5 images per product");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImages((prev) => [...prev, data.url]);
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          condition,
          categoryId,
          stock: parseInt(stock),
          images,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }
      router.push("/seller/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">New Product</h1>
      <p className="text-sm text-slate-500 mb-4">
        Slots used: {productCount} / {maxProducts}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Stock
            </label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
          >
            <option value="A">A - Like New</option>
            <option value="B">B - Good</option>
            <option value="C">C - Fair</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Images (max 5)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading || images.length >= 5}
            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100 disabled:opacity-50"
          />
          {images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative">
                  <Image
                    src={url}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized
                    className="w-20 h-20 object-cover rounded border"
                  />
                  <button
                    onClick={() =>
                      setImages((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !name || !price || !categoryId}
          className="w-full bg-gold-600 text-white py-2 rounded hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Product"}
        </button>
      </div>
    </div>
  );
}
