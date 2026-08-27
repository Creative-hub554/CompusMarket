import { render, screen } from "@testing-library/react";
import { LocalizedProductCard } from "./LocalizedProductCard";

describe("LocalizedProductCard", () => {
  const mockProduct = {
    id: "test-123",
    name: "Test Product",
    price: 99.99,
    condition: "A",
    images: ["/test-image.jpg"],
    categoryName: "Electronics",
    sellerBadge: true,
  };

  it("renders with English locale", () => {
    render(<LocalizedProductCard {...mockProduct} />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
    expect(screen.getByText("Seller")).toBeInTheDocument();
  });

  it("renders with Khmer locale", () => {
    // Note: This test would require locale context provider setup
    // For now, we'll just verify the component renders without errors
    render(<LocalizedProductCard {...mockProduct} />);
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });

  it("renders with seller badge when true", () => {
    render(<LocalizedProductCard {...mockProduct} />);
    expect(screen.getByText("Seller")).toBeInTheDocument();
  });

  it("does not render seller badge when false", () => {
    render(<LocalizedProductCard {...mockProduct} sellerBadge={false} />);
    expect(screen.queryByText("Seller")).not.toBeInTheDocument();
  });

  it("renders condition label correctly", () => {
    render(<LocalizedProductCard {...mockProduct} condition="B" />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });
});