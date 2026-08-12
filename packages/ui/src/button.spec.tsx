import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children with the primary variant classes", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.className).toContain("bg-slate-900");
  });

  it("applies a custom className", () => {
    render(<Button className="mt-4">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain(
      "mt-4",
    );
  });
});
