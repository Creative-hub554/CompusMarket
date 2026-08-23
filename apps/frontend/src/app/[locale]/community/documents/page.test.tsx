import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() })),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("DocumentsPage", () => {
  it("renders sign-in prompt when unauthenticated", async () => {
    const { default: DocumentsPage } = await import("./page");
    const { render, screen } = await import("@testing-library/react");
    render(<DocumentsPage />);
    expect(screen.getByText("Sign in to create and edit rich text documents.")).toBeDefined();
  });
});
