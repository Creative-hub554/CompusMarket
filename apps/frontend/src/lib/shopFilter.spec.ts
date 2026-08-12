import { describe, expect, it } from "vitest";
import { filterProductsByCategory } from "./shopFilter";
import type { Product, Category } from "@/services/api";

const category = (id: string, slug: string): Category => ({
  id,
  name: slug,
  slug,
  _count: { products: 0 },
});

const product = (id: string, categoryId: string): Product =>
  ({
    id,
    name: `Product ${id}`,
    description: "",
    price: 10,
    condition: "A",
    status: "ACTIVE",
    images: [],
    stock: 1,
    category: { id: categoryId, name: categoryId, slug: categoryId },
  }) as Product;

describe("filterProductsByCategory", () => {
  const products = [product("1", "c1"), product("2", "c2"), product("3", "c1")];
  const categories = [category("c1", "phones"), category("c2", "fashion")];

  it("returns all products when no slug is given", () => {
    expect(filterProductsByCategory(products, categories, undefined)).toHaveLength(3);
  });

  it("filters by the category matching the slug", () => {
    const result = filterProductsByCategory(products, categories, "phones");
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("returns an empty array for an unknown slug", () => {
    expect(filterProductsByCategory(products, categories, "nope")).toEqual([]);
  });
});
