import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl, localePath } from "@/lib/site";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/market",
  "/community",
  "/community/careers",
  "/jobs",
  "/terms/buyer",
  "/terms/seller",
];

type ProductSummary = { id: string };
type JobSummary = { id: string };

async function fetchIds(path: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item): item is { id: string } => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as ProductSummary | JobSummary).id === "string"
        );
      })
      .map((item) => item.id)
      .slice(0, 500);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productIds, jobIds] = await Promise.all([
    fetchIds("/products"),
    fetchIds("/jobs"),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: localePath(locale, path),
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.7,
      });
    }
  }

  for (const id of productIds) {
    for (const locale of routing.locales) {
      entries.push({
        url: localePath(locale, `/shop/${id}`),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  for (const id of jobIds) {
    for (const locale of routing.locales) {
      entries.push({
        url: localePath(locale, `/jobs/${id}`),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
