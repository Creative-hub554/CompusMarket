"use client";

import { render, screen } from "@testing-library/react";
import { LocalizedButton } from "../LocalizedButton";

describe("LocalizedButton", () => {
  it("renders with default variant", () => {
    render(<LocalizedButton>Test Button</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("renders with destructive variant", () => {
    render(<LocalizedButton variant="destructive">Delete</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveClass("bg-destructive", "text-destructive-foreground");
  });

  it("renders with outline variant", () => {
    render(<LocalizedButton variant="outline">Outline</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Outline" });
    expect(button).toHaveClass("border", "border-input", "bg-background");
  });

  it("renders with secondary variant", () => {
    render(<LocalizedButton variant="secondary">Secondary</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button).toHaveClass("bg-secondary", "text-secondary-foreground");
  });

  it("renders with ghost variant", () => {
    render(<LocalizedButton variant="ghost">Ghost</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button).toHaveClass("hover:bg-accent", "hover:text-accent-foreground");
  });

  it("renders with link variant", () => {
    render(<LocalizedButton variant="link">Link</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Link" });
    expect(button).toHaveClass("text-primary", "underline-offset-4", "hover:underline");
  });

  it("applies custom className", () => {
    render(<LocalizedButton className="custom-button">Custom</LocalizedButton>);
    const button = screen.getByRole("button", { name: "Custom" });
    expect(button).toHaveClass("custom-button");
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<LocalizedButton ref={ref}>Ref Test</LocalizedButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});