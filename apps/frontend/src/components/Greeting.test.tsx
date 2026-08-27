import { render, screen } from "@testing-library/react";
import { Greeting } from "./Greeting";

describe("Greeting", () => {
  it("renders with default name", () => {
    render(<Greeting name="Guest" />);
    expect(screen.getByText(/Hello Guest/)).toBeInTheDocument();
  });

  it("renders with custom name", () => {
    render(<Greeting name="John" />);
    expect(screen.getByText(/Hello John/)).toBeInTheDocument();
  });

  it("renders Khmer locale correctly", () => {
    render(<Greeting name="ជ្រុង" />);
    expect(screen.getByText(/ជំរាបសួរ ជ្រុង/)).toBeInTheDocument();
  });
});