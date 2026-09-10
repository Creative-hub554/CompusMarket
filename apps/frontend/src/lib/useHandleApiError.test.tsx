import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/apiBase", () => ({
  getApiBase: () => "http://localhost:4000/api",
}));

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockPathname = vi.hoisted(() => "/feed");
const mockSearchString = vi.hoisted(() => "");

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => mockPathname,
  Link: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
  useSearchParams: () => ({ toString: () => mockSearchString }),
}));

const mockToastError = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: mockToastError },
  Toaster: () => null,
}));

import { renderHook, act } from "@testing-library/react";
import { useHandleApiError } from "./useHandleApiError";
import { ApiError } from "@/lib/apiFetch";

beforeEach(() => {
  vi.restoreAllMocks();
  mockRouterPush.mockReset();
  mockToastError.mockReset();
});

describe("useHandleApiError", () => {
  it("redirects to /login with returnUrl on 401", async () => {
    const { result } = renderHook(() => useHandleApiError());

    await act(async () => {
      result.current(
        new ApiError(401, "Unauthorized"),
        "post your update",
        false,
        false,
      );
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/login?returnUrl=%2Ffeed",
    );
    expect(mockToastError).toHaveBeenCalledWith(
      "Your session expired. Please sign in again to post your update.",
    );
  });

  it("does not redirect on 404", async () => {
    const { result } = renderHook(() => useHandleApiError());

    await act(async () => {
      result.current(
        new ApiError(404, "Not found"),
        "react to the post",
        false,
        false,
      );
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "That react to the post isn't available anymore.",
    );
  });

  it("does not redirect on 500", async () => {
    const { result } = renderHook(() => useHandleApiError());

    await act(async () => {
      result.current(
        new ApiError(500, "Server error"),
        "publish your post",
        false,
        false,
      );
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "Server error while publish your post. Please try again.",
    );
  });


});
