"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { LocalizedCart } from "../LocalizedCart";

const mockOnUpdateQuantity = jest.fn();
const mockOnRemoveItem = jest.fn();

const mockItems = [
  { id: "1", name: "Product 1", price: 29.99, quantity: 2 },
  { id: "2", name: "Product 2", price: 49.99, quantity: 1 },
];

describe("LocalizedCart", () => {
  it("renders cart with items", () => {
    render(<LocalizedCart items={mockItems} onUpdateQuantity={mockOnUpdateQuantity} onRemoveItem={mockOnRemoveItem} />);
    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
    expect(screen.getByText("$59.98")).toBeInTheDocument(); // 2 * 29.99 + 1 * 49.99
  });

  it("renders empty cart message when no items", () => {
    render(<LocalizedCart items={[]} />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("handles quantity updates", () => {
    render(<LocalizedCart items={mockItems} onUpdateQuantity={mockOnUpdateQuantity} />);
    const increaseButton = screen.getAllByText("+")[0];
    fireEvent.click(increaseButton);
    expect(mockOnUpdateQuantity).toHaveBeenCalledWith("1", 3);
  });

  it("handles item removal", () => {
    render(<LocalizedCart items={mockItems} onRemoveItem={mockOnRemoveItem} />);
    const removeButton = screen.getAllByText("×")[0];
    fireEvent.click(removeButton);
    expect(mockOnRemoveItem).toHaveBeenCalledWith("1");
  });

  it("applies custom className", () => {
    render(<LocalizedCart items={mockItems} className="custom-cart" />);
    const cart = screen.getByText("Product 1").closest("div");
    expect(cart).toHaveClass("custom-cart");
  });
});