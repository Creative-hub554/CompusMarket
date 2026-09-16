import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantWidget } from "./AssistantWidget";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiFetch", () => ({ apiFetch }));
vi.mock("@/lib/safeStorage", () => ({
  safeLocalStorageGet: vi.fn(),
  safeLocalStorageSet: vi.fn(),
}));

describe("AssistantWidget", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  async function submit(message: string) {
    render(<AssistantWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Champey Assistant" }));
    const input = screen.getByPlaceholderText(/Ask about products/i);
    fireEvent.change(input, { target: { value: message } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
  }

  it("renders the live assistant response and skill", async () => {
    apiFetch.mockResolvedValue({
      reply: "Live product result",
      skill: "product_search",
    });

    await submit("Find a phone");

    expect(await screen.findByText("Live product result")).toBeInTheDocument();
    expect(screen.getAllByText("Products")).toHaveLength(2);
  });

  it.each([
    [
      "returns an unavailable state for an assistant error",
      { error: "run_failed" },
    ],
    [
      "returns an unavailable state when the assistant request fails",
      new Error("offline"),
    ],
  ])("%s", async (_label, response) => {
    if (response instanceof Error) apiFetch.mockRejectedValue(response);
    else apiFetch.mockResolvedValue(response);

    await submit("Find a phone");

    expect(
      await screen.findByText(
        "Something went wrong. Is the assistant running on port 8001?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Khmer Silk Scarf|Junior Web Developer/),
    ).not.toBeInTheDocument();
  });
});
