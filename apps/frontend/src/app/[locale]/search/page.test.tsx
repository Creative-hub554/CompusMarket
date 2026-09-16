import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchResults } from "@/components/search/SearchResults";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/ProductCard", () => ({
  ProductCard: ({ id, returnTo }: { id: string; returnTo?: string }) => <a href={`/shop/${id}?returnTo=${encodeURIComponent(returnTo || "")}`}>market result</a>,
}));

vi.mock("@/components/social/Avatar", () => ({
  Avatar: () => <span>avatar</span>,
}));

describe("SearchResults", () => {
  it("renders supported source sections with safe detail links", () => {
    render(
      <SearchResults
        returnTo="/search?q=phone&type=all"
        t={(key) => key}
        results={{
          market: [{ id: "p1", name: "Phone", price: 10, condition: "A", categoryName: "Phones", images: [] }],
          people: [{ id: "u1", name: "Ada", username: "ada", image: null, bio: "Builder" }],
          jobs: [{ id: "j1", title: "Engineer", company: "PostBase", location: "Remote", type: "REMOTE", description: "Build things" }],
          pages: [{ id: "pg1", name: "PostBase", username: "postbase", category: "Community", description: null, image: null, verified: true }],
          groups: [{ id: "g1", name: "Builders", description: "A group", memberCount: 4, privacy: "PUBLIC" }],
        }}
      />,
    );

    expect(screen.getByText("market result").getAttribute("href")).toContain("returnTo=%2Fsearch%3Fq%3Dphone%26type%3Dall");
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("PostBase")).toBeInTheDocument();
    expect(screen.getByText("Builders")).toBeInTheDocument();
  });

  it("does not render numeric text for empty supported sources", () => {
    const { container } = render(
      <SearchResults returnTo="/search" t={(key) => key} results={{ market: [], people: [], jobs: [], pages: [], groups: [] }} />,
    );

    expect(container.textContent).not.toContain("0");
  });
});
