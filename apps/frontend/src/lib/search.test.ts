import { describe, expect, it } from "vitest";
import { productSearchHref, searchHref, searchSources, withSearchReturnTo } from "./search";

describe("search URLs", () => {
  it("normalizes a query and preserves the selected type", () => {
    expect(searchHref("  phone case  ", "market")).toBe("/search?q=phone+case&type=market");
  });

  it("selects supported sources by type and authentication", () => {
    expect(searchSources("all", false)).toEqual(["market", "jobs", "pages", "groups"]);
    expect(searchSources("all", true)).toEqual(["people", "market", "jobs", "pages", "groups"]);
    expect(searchSources("people", false)).toEqual([]);
    expect(searchSources("posts", true)).toEqual([]);
  });

  it("adds encoded return context to every detail link", () => {
    expect(withSearchReturnTo("/jobs/job-1", "/search?q=engineer&type=jobs")).toBe(
      "/jobs/job-1?returnTo=%2Fsearch%3Fq%3Dengineer%26type%3Djobs",
    );
  });

  it("encodes the search route for a product detail return link", () => {
    expect(productSearchHref("product-1", "/search?q=phone+case&type=market")).toBe(
      "/shop/product-1?returnTo=%2Fsearch%3Fq%3Dphone%2Bcase%26type%3Dmarket",
    );
  });
});
