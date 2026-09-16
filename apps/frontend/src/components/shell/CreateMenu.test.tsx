import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CreateMenu } from "./CreateMenu";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
  usePathname: () => "/market",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=recent"),
}));

vi.mock("@/lib/session-client", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => ({
    create: "Create",
    createPost: "Post",
    createListing: "Listing",
    createJob: "Job",
    createPage: "Page",
    createGroup: "Group",
    createAuthHint: "Sign in is required for creation actions.",
    closeCreate: "Close create menu",
    signIn: "Sign In",
  }[key] || key),
}));

describe("CreateMenu", () => {
  it("shows supported choices with the current context and auth guidance", () => {
    render(<CreateMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Sign in is required for creation actions.")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Post" })).toHaveAttribute("href", "/feed?returnTo=%2Fen%2Fmarket%3Ftab%3Drecent");
    expect(screen.getByRole("menuitem", { name: "Listing" })).toHaveAttribute("href", "/seller/products/new?returnTo=%2Fen%2Fmarket%3Ftab%3Drecent");
    expect(screen.getByRole("menuitem", { name: "Job" })).toHaveAttribute("href", "/jobs/post?returnTo=%2Fen%2Fmarket%3Ftab%3Drecent");
    expect(screen.getByRole("menuitem", { name: "Page" })).toHaveAttribute("href", "/pages/new?returnTo=%2Fen%2Fmarket%3Ftab%3Drecent");
    expect(screen.getByRole("menuitem", { name: "Group" })).toHaveAttribute("href", "/community/groups?returnTo=%2Fen%2Fmarket%3Ftab%3Drecent");
  });

  it("supports the mobile trigger and closes on Escape", () => {
    render(<CreateMenu mobile />);
    const trigger = screen.getByRole("button", { name: "Create" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Create" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Create" })).not.toBeInTheDocument();
  });
});
