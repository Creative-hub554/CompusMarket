import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/en/verify-email",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("status=error"),
}));

// The page routes through lucide-react icon components only (SVG renders fine)
// and a Suspense boundary wrapping the status; waitFor handles the async render.

describe("VerifyEmailPage resend form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the resend form in the error state", async () => {
    const { default: VerifyEmailPage } = await import("./page");
    render(<VerifyEmailPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /resend verification email/i })).toBeDefined(),
    );
    expect(screen.getByPlaceholderText("Your email")).toBeDefined();
  });

  it("submits the email to the session-free verify-email endpoint and shows confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: VerifyEmailPage } = await import("./page");
    render(<VerifyEmailPage />);

    const input = await screen.findByPlaceholderText("Your email");
    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/verify-email",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", locale: "en" }),
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/a new verification link has been sent/i)).toBeDefined(),
    );
  });

  it("always shows confirmation even when the endpoint returns an error (no enumeration)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    const { default: VerifyEmailPage } = await import("./page");
    render(<VerifyEmailPage />);

    const input = await screen.findByPlaceholderText("Your email");
    fireEvent.change(input, { target: { value: "ghost@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() =>
      expect(screen.getByText(/a new verification link has been sent/i)).toBeDefined(),
    );
  });
});
