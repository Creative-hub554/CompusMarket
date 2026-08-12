import { describe, expect, it } from "vitest";
import { filterArticlesByCategory } from "./articleFilter";
import type { Article } from "./articleFilter";

const articles: Article[] = [
  { id: "1", title: "Interview Tips", slug: "interview-tips", categorySlug: "interviews" },
  { id: "2", title: "Resume Guide", slug: "resume-guide", categorySlug: "resumes" },
  { id: "3", title: "Salary Talk", slug: "salary-talk", categorySlug: "interviews" },
];

describe("filterArticlesByCategory", () => {
  it("returns all articles when no slug is given", () => {
    expect(filterArticlesByCategory(articles, undefined)).toHaveLength(3);
  });

  it("filters by the requested category", () => {
    expect(filterArticlesByCategory(articles, "interviews").map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("returns an empty array for an unknown category", () => {
    expect(filterArticlesByCategory(articles, "none")).toEqual([]);
  });
});
