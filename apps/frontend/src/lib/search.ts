export const SEARCH_TYPES = [
  "all",
  "people",
  "posts",
  "market",
  "jobs",
  "pages",
  "groups",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];
export type SearchSource = Exclude<SearchType, "all" | "posts">;

export function searchSources(
  type: SearchType,
  authenticated: boolean,
): SearchSource[] {
  if (type === "posts") return [];
  if (type !== "all") {
    return type === "people" && !authenticated ? [] : [type];
  }

  return authenticated
    ? ["people", "market", "jobs", "pages", "groups"]
    : ["market", "jobs", "pages", "groups"];
}

export function searchHref(query: string, type: SearchType = "all") {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("type", type);
  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ""}`;
}

export function withSearchReturnTo(path: string, returnTo: string) {
  return `${path}${path.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
}

export function productSearchHref(productId: string, returnTo: string) {
  return withSearchReturnTo(`/shop/${productId}`, returnTo);
}
