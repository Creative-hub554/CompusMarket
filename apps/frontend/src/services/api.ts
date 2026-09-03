import { getApiBase } from "@/lib/apiBase";

const API_BASE = getApiBase();

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

const cache = new Map<string, { data: unknown; expiry: number }>();

function cacheKey(path: string, options?: RequestInit): string | null {
  if (options?.method && options.method !== "GET") return null;
  const headers = options?.headers;
  const auth = headers instanceof Headers
    ? headers.get("Authorization") ?? ""
    : headers?.["Authorization" as keyof typeof headers] ?? "";
  return `${auth}:${path}`;
}

export async function fetchApi<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number; retries?: number; cacheTtlMs?: number }
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES, cacheTtlMs, ...fetchOptions } = options ?? {};
  const method = fetchOptions.method ?? "GET";

  if (method === "GET" && cacheTtlMs) {
    const key = cacheKey(path, options);
    if (key) {
      const entry = cache.get(key);
      if (entry && Date.now() < entry.expiry) return entry.data as T;
    }
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        headers: { "Content-Type": "application/json", ...fetchOptions?.headers },
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = new Error(`API error: ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      const data: T = await res.json();
      if (method === "GET" && cacheTtlMs) {
        const key = cacheKey(path, options);
        if (key) cache.set(key, { data, expiry: Date.now() + cacheTtlMs });
      }
      return data;
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (isAbort) {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      const status = (lastError as Error & { status?: number }).status;
      if (status !== undefined && status < 500) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 2 ** attempt * 300));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
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
    browse: (params: { category?: string; q?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params.category) q.set("category", params.category);
      if (params.q) q.set("q", params.q);
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
    related: (id: string) => fetchApi<Product[]>(`/products/${id}/related`),
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
