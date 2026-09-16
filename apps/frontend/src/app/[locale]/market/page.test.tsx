import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import MarketPage from "./page";

const searchParams = new URLSearchParams("q=phone&categoryId=cat-1");

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
  usePathname: () => "/market",
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string, values?: { count?: number }) => values?.count === undefined ? key : `${key}:${values.count}` }));
vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn((path: string) => path === "/api/categories"
    ? Promise.resolve([{ id: "cat-1", name: "Phones", slug: "phones" }])
    : Promise.resolve({ hits: [{ id: "p1", name: "Phone", price: 10, condition: "A", categoryName: "Phones", images: [] }], total: 1 })),
}));
vi.mock("@/components/ProductCard", () => ({ ProductCard: ({ name }: { name: string }) => <article>{name}</article> }));

describe("MarketPage", () => {
  it("leads with Sell and preserves locale/filter context", async () => {
    render(<MarketPage />);
    const sell = screen.getByRole("link", { name: "sell" });
    expect(sell.getAttribute("href")).toBe("/seller/products/new?returnTo=%2Fen%2Fmarket%3Fq%3Dphone%26categoryId%3Dcat-1");
    expect(screen.getAllByRole("searchbox").length).toBe(2);
    expect(screen.queryByText("reelsTitle")).not.toBeInTheDocument();
    expect(screen.getAllByText("locationUnavailable").length).toBe(2);
    await waitFor(() => expect(screen.getByText("Phone")).toBeInTheDocument());
  });

  it("removes individual filter chips without clearing the remaining state", async () => {
    render(<MarketPage />);
    const removeSearch = screen.getByRole("button", { name: "removeFilter: searchLabel: phone" });
    fireEvent.click(removeSearch);

    await waitFor(() => expect(screen.queryByRole("button", { name: "removeFilter: searchLabel: phone" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "removeFilter: Phones" })).toBeInTheDocument();
    expect(window.location.search).toContain("categoryId=cat-1");
    expect(window.location.search).not.toContain("q=phone");
  });
});
