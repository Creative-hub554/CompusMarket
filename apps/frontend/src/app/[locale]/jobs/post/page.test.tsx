import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostJobPage from "./page";

const { push, create } = vi.hoisted(() => ({ push: vi.fn(), create: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("returnTo=%2Fen%2Fmarket%3Ftab%3Drecent") }));
vi.mock("@/lib/session-client", () => ({ useSession: () => ({ data: { user: { id: "u1" } } }) }));
vi.mock("@/services/jobs", () => ({ jobsApi: { create } }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));

describe("PostJobPage", () => {
  it("returns to the originating locale context after success", async () => {
    create.mockResolvedValueOnce({ id: "job-1" });
    render(<PostJobPage />);

    const fields = screen.getAllByRole("textbox");
    fireEvent.change(fields[0], { target: { value: "Engineer" } });
    fireEvent.change(fields[1], { target: { value: "PostBase" } });
    fireEvent.change(fields[2], { target: { value: "Remote" } });
    fireEvent.change(fields[3], { target: { value: "Build things" } });
    fireEvent.click(screen.getByRole("button", { name: "createJob" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/market?tab=recent"));
  });
});
