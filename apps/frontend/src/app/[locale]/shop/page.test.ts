import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import ShopPage from "./page";

describe("legacy shop route", () => {
  it("redirects to the canonical market browse route", () => {
    ShopPage();
    expect(redirectMock).toHaveBeenCalledWith("/market");
  });
});
