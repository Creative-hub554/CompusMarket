"use client";

import { render, screen } from "@testing-library/react";
import { LocalizedAvatar } from "../LocalizedAvatar";

describe("LocalizedAvatar", () => {
  it("renders with image source", () => {
    render(<LocalizedAvatar src="/avatar.jpg" alt="Test Avatar" />);
    const avatar = screen.getByRole("img");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "/avatar.jpg");
  });

  it("renders with fallback text", () => {
    render(<LocalizedAvatar alt="Test Avatar" fallback="JD" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("generates initials from alt text", () => {
    render(<LocalizedAvatar alt="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies custom size classes", () => {
    render(<LocalizedAvatar size="sm" />);
    const avatar = screen.getByRole("img") || screen.getByText("?");
    expect(avatar).toHaveClass("w-8", "h-8");
  });

  it("applies custom className", () => {
    render(<LocalizedAvatar className="custom-avatar" />);
    const avatar = screen.getByRole("img") || screen.getByText("?");
    expect(avatar).toHaveClass("custom-avatar");
  });
});