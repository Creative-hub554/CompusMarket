import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/apiBase", () => ({
  getApiBase: () => "http://localhost:4000/api",
}));

const mockPathname = vi.hoisted(() => "/feed");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const mockRouterPush = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => mockPathname,
  Link: ({ children }: { children: React.ReactNode }) =>
    children as React.ReactElement,
  useSearchParams: () => ({ toString: () => "" }),
}));

const mockToastError = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: mockToastError },
  Toaster: () => null,
}));

// Track what body useAuthedFetch receives — both the initial call and the retry.
const capturedBodies: unknown[] = [];
const mockAuthedFetch = vi.hoisted(() =>
  vi.fn().mockImplementation(async (url, init) => {
    // The /api/resumes GET (no body) resolves normally so hasResume stays false.
    if (!init?.body) {
      return [] as unknown[];
    }
    // Capture the chat request body at call time.
    capturedBodies.push(init.body);
    // First chat POST (the real send): throw so handleApiError triggers the retry.
    // This mirrors what apiFetch does on a 5xx — throw ApiError.
    if (capturedBodies.length === 1) {
      throw new ApiError(500, "server error", { error: "server error" });
    }
    // Second chat POST (the retry): succeed so the retryResult path is exercised.
    return {
      reply: "hello",
      products: [],
      links: [],
    };
  }),
);

vi.mock("@/lib/useAuthedFetch", () => ({
  useAuthedFetch: () => mockAuthedFetch,
}));

vi.mock("@/lib/useTranslation", () => ({
  useTranslation: () => ({
    t: {
      aiAssistant: {
        title: "Champey Assistant",
        error: "Something went wrong",
        inputPlaceholder: "Ask...",
      },
      nav: {},
      ai: {},
    },
  }),
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import { AiAssistant } from "./AiAssistant";
import { ApiError } from "@/lib/apiFetch";

beforeEach(() => {
  vi.restoreAllMocks();
  capturedBodies.length = 0;
  mockRouterPush.mockReset();
  mockToastError.mockReset();
});

describe("AiAssistant sendMessage retry", () => {
  it("retry replays the same request body captured at call time", async () => {
    render(<AiAssistant />);

    // Open the assistant panel.
    const openButton = screen.getByRole("button", {
      name: /champey assistant/i,
    });
    await act(async () => {
      fireEvent.click(openButton);
    });

    const input = screen.getByPlaceholderText("Ask...");
    expect(input).toBeInTheDocument();

    // Type a message and submit with Enter (avoids the disabled Send button
    // timing issue after the controlled input update).
    await act(async () => {
      fireEvent.change(input, { target: { value: "hello" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", which: 13 });
    });

    // Wait for the 800ms retry backoff inside handleApiError to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900));
    });

    // One resume GET (no body) + one initial chat POST (500) + one retry chat
    // POST (success) that the body was captured for.
    expect(capturedBodies).toHaveLength(2);

    // The body captured at call time reflects the component state when
    // sendMessage was invoked — lang, hasResume, page, and the message.
    expect(capturedBodies[0]).toEqual({
      message: "hello",
      lang: "en",
      hasResume: false,
      page: "/feed",
    });

    // The retry body is identical to the original — the retryFn closes over
    // the captured body, not live component state that may have changed.
    expect(capturedBodies[1]).toEqual(capturedBodies[0]);
  });
});
