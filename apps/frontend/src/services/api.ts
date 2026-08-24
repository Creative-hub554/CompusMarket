const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetchApi<T>(
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
  sellerId?: string;
  images: string[];
  videoUrl?: string | null;
  qrCode?: string;
  serialNumber?: string;
  stock: number;
  warrantyMonths?: number;
  category: { id: string; name: string; slug: string };
  reviews?: Review[];
  createdAt: string;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  createdAt: string;
  user: { name: string | null };
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export type Resume = {
  id: string;
  userId: string;
  title: string;
  template: string;
  data: Record<string, unknown>;
  photo?: string;
  createdAt: string;
  updatedAt: string;
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
  author?: { name: string | null };
  createdAt: string;
};

export type PromoProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  videoUrl: string;
  condition: string;
};

export const api = {
  products: {
    list: () => fetchApi<Product[]>("/products"),
    browse: (params: { category?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params.category) q.set("category", params.category);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      return fetchApi<{
        items: Product[];
        total: number;
        page: number;
        limit: number;
      }>(`/products/browse${qs ? `?${qs}` : ""}`);
    },
    byId: (id: string) => fetchApi<Product>(`/products/${id}`),
    byCategory: (slug: string) =>
      fetchApi<Product[]>(`/products/category/${slug}`),
    promos: () => fetchApi<PromoProduct[]>("/products/promos"),
  },
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
  },
  resumes: {
    list: (token: string) =>
      fetchApi<Resume[]>("/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    byId: (id: string, token: string) =>
      fetchApi<Resume>(`/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    create: (data: { title: string; data: Record<string, unknown> }, token: string) =>
      fetchApi<Resume>("/resumes", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    update: (
      id: string,
      data: { title?: string; data?: Record<string, unknown> },
      token: string
    ) =>
      fetchApi<Resume>(`/resumes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    delete: (id: string, token: string) =>
      fetchApi<void>(`/resumes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
  articles: {
    list: () => fetchApi<Article[]>("/articles"),
    bySlug: (slug: string) => fetchApi<Article>(`/articles/${slug}`),
    byCategory: (category: string) =>
      fetchApi<Article[]>(`/articles/category/${category}`),
  },
};
