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
  images: string[];
  qrCode?: string;
  serialNumber?: string;
  stock: number;
  warrantyMonths?: number;
  category: { id: string; name: string; slug: string };
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export const api = {
  products: {
    list: () => fetchApi<Product[]>("/products"),
    byId: (id: string) => fetchApi<Product>(`/products/${id}`),
    byCategory: (slug: string) =>
      fetchApi<Product[]>(`/products/category/${slug}`),
  },
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
  },
};
