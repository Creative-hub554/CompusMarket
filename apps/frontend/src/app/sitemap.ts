import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl, localePath } from "@/lib/site";
import { getApiBase } from "@/lib/apiBase";

const API_BASE = getApiBase();

const STATIC_PATHS = [
  "/",
  "/shop",
  "/market",
  "/community",
  "/community/careers",
  "/community/notes",
  "/community/flashcards",
  "/community/quizzes",
  "/community/diagrams",
  "/community/documents",
  "/community/resume",
  "/community/design",
  "/community/groups",
  "/feed",
  "/jobs",
  "/support",
  "/terms/buyer",
  "/terms/seller",
];

type Summary = { id: string };
type ArticleSummary = { slug: string };

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
      .filter((item): item is Summary => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as Summary).id === "string"
        );
      })
      .map((item) => item.id)
      .slice(0, 500);
  } catch {
    return [];
  }
}

async function fetchSlugs(path: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item): item is ArticleSummary => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as ArticleSummary).slug === "string"
        );
      })
      .map((item) => item.slug)
      .slice(0, 500);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productIds, jobIds, articleSlugs, groupIds] = await Promise.all([
    fetchIds("/products"),
    fetchIds("/jobs"),
    fetchSlugs("/articles"),
    fetchIds("/groups?limit=500"),
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

  for (const slug of articleSlugs) {
    for (const locale of routing.locales) {
      entries.push({
        url: localePath(locale, `/community/careers/${slug}`),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  for (const id of groupIds) {
    for (const locale of routing.locales) {
      entries.push({
        url: localePath(locale, `/community/groups/${id}`),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
