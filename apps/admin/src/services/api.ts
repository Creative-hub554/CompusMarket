const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
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
    create: (data: Record<string, unknown>) =>
      fetchApi<Product>("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi<Product>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/products/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
    seed: () => fetchApi<Category[]>("/categories/seed", { method: "POST" }),
  },
  articles: {
    list: () => fetchApi<Article[]>("/articles"),
    all: () => fetchApi<Article[]>("/articles/all"),
    bySlug: (slug: string) => fetchApi<Article>(`/articles/${slug}`),
    create: (data: Record<string, unknown>) =>
      fetchApi<Article>("/articles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi<Article>(`/articles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
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
