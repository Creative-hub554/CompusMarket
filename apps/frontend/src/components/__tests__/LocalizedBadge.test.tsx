"use client";

import { render, screen } from "@testing-library/react";
import { LocalizedBadge } from "../LocalizedBadge";

describe("LocalizedBadge", () => {
  it("renders with default variant", () => {
    render(<LocalizedBadge>Test Badge</LocalizedBadge>);
    const badge = screen.getByText("Test Badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
  });

  it("renders with secondary variant", () => {
    render(<LocalizedBadge variant="secondary">Secondary Badge</LocalizedBadge>);
    const badge = screen.getByText("Secondary Badge");
    expect(badge).toHaveClass("bg-gray-100", "text-gray-800");
  });

  it("renders with destructive variant", () => {
    render(<LocalizedBadge variant="destructive">Error Badge</LocalizedBadge>);
    const badge = screen.getByText("Error Badge");
    expect(badge).toHaveClass("bg-red-100", "text-red-800");
  });

  it("renders with outline variant", () => {
    render(<LocalizedBadge variant="outline">Outline Badge</LocalizedBadge>);
    const badge = screen.getByText("Outline Badge");
    expect(badge).toHaveClass("border", "border-gray-300", "text-gray-700");
  });

  it("applies custom className", () => {
    render(<LocalizedBadge className="custom-badge">Custom Badge</LocalizedBadge>);
    const badge = screen.getByText("Custom Badge");
    expect(badge).toHaveClass("custom-badge");
  });
});