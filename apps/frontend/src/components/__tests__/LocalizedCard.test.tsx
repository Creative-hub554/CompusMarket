"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { LocalizedCard, LocalizedCardHeader, LocalizedCardTitle, LocalizedCardContent, LocalizedCardFooter } from "../LocalizedCard";

const mockOnClick = jest.fn();

describe("LocalizedCard", () => {
  it("renders correctly with children", () => {
    render(
      <LocalizedCard>
        <div>Test Content</div>
      </LocalizedCard>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <LocalizedCard className="custom-class">
        <div>Test</div>
      </LocalizedCard>
    );
    const card = screen.getByText("Test").closest("div");
    expect(card).toHaveClass("custom-class");
  });

  it("handles click events", () => {
    render(
      <LocalizedCard onClick={mockOnClick}>
        <div>Clickable Card</div>
      </LocalizedCard>
    );
    fireEvent.click(screen.getByText("Clickable Card"));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

describe("LocalizedCardHeader", () => {
  it("renders header content", () => {
    render(<LocalizedCardHeader>Header Content</LocalizedCardHeader>);
    expect(screen.getByText("Header Content")).toBeInTheDocument();
  });
});

describe("LocalizedCardTitle", () => {
  it("renders title with correct styling", () => {
    render(<LocalizedCardTitle>Title Text</LocalizedCardTitle>);
    const title = screen.getByText("Title Text");
    expect(title).toHaveClass("text-lg font-semibold");
  });
});

describe("LocalizedCardContent", () => {
  it("renders content with correct styling", () => {
    render(<LocalizedCardContent>Content Text</LocalizedCardContent>);
    const content = screen.getByText("Content Text");
    expect(content).toHaveClass("text-sm");
  });
});

describe("LocalizedCardFooter", () => {
  it("renders footer with border styling", () => {
    render(<LocalizedCardFooter>Footer Content</LocalizedCardFooter>);
    const footer = screen.getByText("Footer Content").closest("div");
    expect(footer).toHaveClass("border-t");
  });
});