"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { LocalizedRating } from "../LocalizedRating";

const mockOnChange = jest.fn();

describe("LocalizedRating", () => {
  it("renders with default value", () => {
    render(<LocalizedRating value={3} />);
    expect(screen.getByText("rating")).toBeInTheDocument();
  });

  it("handles rating changes", () => {
    render(<LocalizedRating value={2} onChange={mockOnChange} />);
    const stars = screen.getAllByRole("button");
    fireEvent.click(stars[2]); // Click third star
    expect(mockOnChange).toHaveBeenCalledWith(3);
  });

  it("renders read-only mode", () => {
    render(<LocalizedRating value={4} readOnly />);
    const stars = screen.getAllByRole("button");
    expect(stars).toHaveLength(5);
  });

  it("applies custom className", () => {
    render(<LocalizedRating value={3} className="custom-rating" />);
    const rating = screen.getByText("rating").closest("div");
    expect(rating).toHaveClass("custom-rating");
  });
});