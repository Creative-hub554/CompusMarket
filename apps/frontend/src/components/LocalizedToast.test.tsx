"use client";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LocalizedToast } from "../LocalizedToast";

const mockOnClose = jest.fn();

describe("LocalizedToast", () => {
  it("renders success toast", () => {
    render(<LocalizedToast message="Success message" type="success" onClose={mockOnClose} />);
    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders error toast", () => {
    render(<LocalizedToast message="Error message" type="error" onClose={mockOnClose} />);
    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("renders warning toast", () => {
    render(<LocalizedToast message="Warning message" type="warning" onClose={mockOnClose} />);
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });

  it("renders info toast", () => {
    render(<LocalizedToast message="Info message" type="info" onClose={mockOnClose} />);
    expect(screen.getByText("Info message")).toBeInTheDocument();
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("handles close button click", () => {
    render(<LocalizedToast message="Test message" onClose={mockOnClose} />);
    const closeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("auto-closes after duration", async () => {
    render(<LocalizedToast message="Auto close test" duration={100} onClose={mockOnClose} />);
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }, { timeout: 200 });
  });

  it("applies custom className", () => {
    render(<LocalizedToast message="Custom toast" className="custom-toast" onClose={mockOnClose} />);
    const toast = screen.getByText("Custom toast").closest("div");
    expect(toast).toHaveClass("custom-toast");
  });
});