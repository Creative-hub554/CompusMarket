"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, type Category } from "@/services/api";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    condition: "A",
    categoryId: "",
    stock: "1",
    warrantyMonths: "",
    serialNumber: "",
  });

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      api.products.byId(params.id as string),
    ]).then(([cats, product]) => {
      setCategories(cats);
      setImages(product.images || []);
      setForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        condition: product.condition,
        categoryId: product.category.id,
        stock: product.stock.toString(),
        warrantyMonths: product.warrantyMonths?.toString() || "",
        serialNumber: product.serialNumber || "",
      });
      setLoading(false);
    });
  }, [params.id]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload(file);
      setImages((prev) => [...prev, result.url]);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    }
    setUploading(false);
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.products.update(params.id as string, {
      ...form,
      images,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      warrantyMonths: form.warrantyMonths
        ? parseInt(form.warrantyMonths)
        : undefined,
    });
    router.push("/admin/products");
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((url) => (
              <div key={url} className="relative h-20 w-20 rounded border">
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
            rows={4}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="A">A - Like New</option>
              <option value="B">B - Good</option>
              <option value="C">C - Fair</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm"
              required
            >
              <option value="">Select...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Warranty (months)
            </label>
            <input
              type="number"
              value={form.warrantyMonths}
              onChange={(e) =>
                setForm({ ...form, warrantyMonths: e.target.value })
              }
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Serial Number
            </label>
            <input
              type="text"
              value={form.serialNumber}
              onChange={(e) =>
                setForm({ ...form, serialNumber: e.target.value })
              }
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="rounded bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Update Product"}
        </button>
      </form>
    </div>
  );
}
