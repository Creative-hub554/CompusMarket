import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListingActions } from "./ListingActions";

vi.mock("@/components/social/ReportButton", () => ({ ReportButton: ({ targetType, targetId }: { targetType: string; targetId: string }) => <button>{targetType}:{targetId}</button> }));

describe("ListingActions", () => {
  it("exposes share and product report actions", async () => {
    render(<ListingActions productId="p1" name="Phone" />);

    expect(screen.getByRole("button", { name: "Share listing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PRODUCT:p1" })).toBeInTheDocument();
  });
});
