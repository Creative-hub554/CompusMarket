import { apiFetch, type ApiFetchOptions } from "@/lib/apiFetch";
import type { ProductCondition, ProductStatus } from "@theo/database";

// Kept as an alias so existing callers keep working; the implementation
// (retry/timeout/cache/error normalization) now lives in lib/apiFetch.ts.
export { apiFetch as fetchApi };
export type { ApiFetchOptions };

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: ProductCondition;
  status: ProductStatus;
  sellerId?: string;
  images: string[];
  videoUrl?: string | null;
  qrCode?: string;
  serialNumber?: string;
  stock: number;
  warrantyMonths?: number;
  category: { id: string; name: string; slug: string };
  reviews?: Review[];
  ratingAvg?: number;
  ratingCount?: number;
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

type Resume = {
  id: string;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export const api = {
  products: {
    list: () => apiFetch<Product[]>("/products"),
    browse: (params: { category?: string; q?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params.category) q.set("category", params.category);
      if (params.q) q.set("q", params.q);
      if (params.page) q.set("page", String(params.page));
      if (params.limit) q.set("limit", String(params.limit));
      const qs = q.toString();
      return apiFetch<{
        items: Product[];
        total: number;
        page: number;
        limit: number;
      }>(`/products/browse${qs ? `?${qs}` : ""}`);
    },
    byId: (id: string) => apiFetch<Product>(`/products/${id}`),
    byCategory: (slug: string) =>
      apiFetch<Product[]>(`/products/category/${slug}`),
    promos: () => apiFetch<PromoProduct[]>("/products/promos"),
    related: (id: string) => apiFetch<Product[]>(`/products/${id}/related`),
  },
  categories: {
    list: (options?: ApiFetchOptions) =>
      apiFetch<Category[]>("/categories", options),
  },
  resumes: {
    list: (token: string) =>
      apiFetch<Resume[]>("/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    byId: (id: string, token: string) =>
      apiFetch<Resume>(`/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    create: (data: { title: string; data: Record<string, unknown> }, token: string) =>
      apiFetch<Resume>("/resumes", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    update: (
      id: string,
      data: { title?: string; data?: Record<string, unknown> },
      token: string
    ) =>
      apiFetch<Resume>(`/resumes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      }),
    delete: (id: string, token: string) =>
      apiFetch<void>(`/resumes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
  articles: {
    list: () => apiFetch<Article[]>("/articles"),
    bySlug: (slug: string) => apiFetch<Article>(`/articles/${slug}`),
    byCategory: (category: string) =>
      apiFetch<Article[]>(`/articles/category/${category}`),
  },
};
