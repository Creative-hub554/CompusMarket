"use client";

import { render, screen } from "@testing-library/react";
import { LocalizedPriceDisplay } from "../LocalizedPriceDisplay";

describe("LocalizedPriceDisplay", () => {
  it("renders USD price correctly", () => {
    render(<LocalizedPriceDisplay price={29.99} currency="USD" />);
    expect(screen.getByText("$29.99")).toBeInTheDocument();
  });

  it("renders KHR price correctly", () => {
    render(<LocalizedPriceDisplay price={10} currency="KHR" />);
    expect(screen.getByText("₭4,100.00")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<LocalizedPriceDisplay price={19.99} className="custom-price" />);
    const price = screen.getByText("$19.99");
    expect(price).toHaveClass("custom-price");
  });

  it("hides currency symbol when showCurrencySymbol is false", () => {
    render(<LocalizedPriceDisplay price={29.99} showCurrencySymbol={false} />);
    expect(screen.getByText("29.99")).toBeInTheDocument();
    expect(screen.queryByText("$29.99")).not.toBeInTheDocument();
  });
});