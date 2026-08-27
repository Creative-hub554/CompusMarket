"use client";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LocalizedSearch } from "../LocalizedSearch";

const mockOnSearch = jest.fn();

describe("LocalizedSearch", () => {
  it("renders with default placeholder", () => {
    render(<LocalizedSearch onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<LocalizedSearch placeholder="Find products..." onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText("Find products...");
    expect(input).toBeInTheDocument();
  });

  it("handles input changes", () => {
    render(<LocalizedSearch onSearch={mockOnSearch} />);
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test query" } });
    expect(input).toHaveValue("test query");
  });

  it("debounces search calls", async () => {
    render(<LocalizedSearch onSearch={mockOnSearch} debounceMs={100} />);
    const input = screen.getByPlaceholderText("Search...");
    
    fireEvent.change(input, { target: { value: "test" } });
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith("test");
    }, { timeout: 200 });
  });

  it("applies custom className", () => {
    render(<LocalizedSearch onSearch={mockOnSearch} className="custom-search" />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveClass("custom-search");
  });
});