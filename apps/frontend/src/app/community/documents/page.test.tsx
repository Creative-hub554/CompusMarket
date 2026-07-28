import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

describe("DocumentsPage", () => {
  it("renders sign-in prompt when unauthenticated", async () => {
    const { default: DocumentsPage } = await import("./page");
    const { render, screen } = await import("@testing-library/react");
    render(<DocumentsPage />);
    expect(screen.getByText("Sign in to create and edit rich text documents.")).toBeDefined();
  });
});
