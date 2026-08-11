const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  images: string[];
  qrCode?: string;
  serialNumber?: string;
  stock: number;
  warrantyMonths?: number;
  category: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  published: boolean;
  author: { name: string | null };
  createdAt: string;
};

export const api = {
  products: {
    list: () => fetchApi<Product[]>("/products"),
    byId: (id: string) => fetchApi<Product>(`/products/${id}`),
    create: (data: Record<string, unknown>, token?: string) =>
      fetchApi<Product>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }, token),
    update: (id: string, data: Record<string, unknown>, token?: string) =>
      fetchApi<Product>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }, token),
    delete: (id: string, token?: string) =>
      fetchApi<void>(`/products/${id}`, { method: "DELETE" }, token),
  },
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
    seed: () => fetchApi<Category[]>("/categories/seed", { method: "POST" }),
    adminList: () =>
      fetch("/api/admin/categories").then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    create: (data: Record<string, unknown>) =>
      fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    update: (id: string, data: Record<string, unknown>) =>
      fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    remove: (id: string) =>
      fetch(`/api/admin/categories/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
  },
  articles: {
    list: () => fetchApi<Article[]>("/articles"),
    all: () =>
      fetch("/api/admin/articles").then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    bySlug: (slug: string) => fetchApi<Article>(`/articles/${slug}`),
    create: (data: Record<string, unknown>) =>
      fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    update: (id: string, data: Record<string, unknown>) =>
      fetch(`/api/admin/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
    byId: (id: string) =>
      fetch(`/api/admin/articles/${id}`).then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }),
  },
  stats: () =>
    fetch("/api/admin/stats").then((r) => {
      if (!r.ok) throw new Error(`API error: ${r.status}`);
      return r.json();
    }),
  upload: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
};
