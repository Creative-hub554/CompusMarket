"use client";

import { render, screen } from "@testing-library/react";
import { LocalizedTable } from "../LocalizedTable";

interface TestData {
  id: number;
  name: string;
  email: string;
}

const testData: TestData[] = [
  { id: 1, name: "John Doe", email: "john@example.com" },
  { id: 2, name: "Jane Smith", email: "jane@example.com" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com" },
];

const columns = [
  { key: "id" as keyof TestData, header: "ID" },
  { key: "name" as keyof TestData, header: "Name" },
  { key: "email" as keyof TestData, header: "Email" },
];

describe("LocalizedTable", () => {
  it("renders table with data", () => {
    render(<LocalizedTable data={testData} columns={columns} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<LocalizedTable data={testData} columns={columns} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<LocalizedTable data={testData} columns={columns} className="custom-table" />);
    const table = screen.getByRole("table");
    expect(table).toHaveClass("custom-table");
  });

  it("renders empty table when no data", () => {
    render(<LocalizedTable data={[]} columns={columns} />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
  });
});