import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());
const sessionState = vi.hoisted(() => ({ user: { id: "u1", name: "Ada" } as { id: string; name: string } | null }));

vi.mock("next/navigation", () => ({
  redirect,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/session-client", () => ({
  useSession: () => ({ data: sessionState.user ? { user: sessionState.user } : null }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(async (path: string) => path === "/api/feed" ? { items: [], nextCursor: null } : []),
  handleApiError: vi.fn(),
}));

vi.mock("@/components/RequireAuth", () => ({
  RequireAuth: ({ message }: { message: string }) => <p>{message}</p>,
}));
vi.mock("@/components/social/Composer", () => ({ Composer: () => <div data-testid="composer">composer</div> }));
vi.mock("@/components/social/StoriesBar", () => ({ StoriesBar: () => <div>stories</div> }));
vi.mock("@/components/social/PostCard", () => ({ PostCard: () => <div>post</div> }));
vi.mock("@/components/ui/ErrorBoundary", () => ({ ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/social/FollowButton", () => ({ FollowButton: () => <button>Follow</button> }));
vi.mock("@/components/social/Avatar", () => ({ Avatar: () => <span>avatar</span> }));
vi.mock("@/components/chat/ChatDock", () => ({ OnlineContacts: () => <div>contacts</div> }));
vi.mock("@/components/market/MarketplaceListing", () => ({ MarketplaceListing: () => <div>listing</div> }));

beforeEach(() => {
  redirect.mockReset();
  sessionState.user = { id: "u1", name: "Ada" };
});

describe("locale Home", () => {
  it("redirects the canonical locale Home to the shared feed route", async () => {
    const { default: Home } = await import("./page");
    Home();
    expect(redirect).toHaveBeenCalledWith("/feed");
  });

  it("renders feed tabs and the composer for authenticated users", async () => {
    const { default: FeedPage } = await import("./feed/page");
    render(<FeedPage />);

    expect(screen.getByRole("navigation", { name: "feedView" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "forYou" })).toHaveAttribute("href", "/feed?tab=for-you");
    expect(screen.getByRole("link", { name: "following" })).toHaveAttribute("href", "/feed?tab=following");
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });

  it("keeps the guest auth boundary instead of rendering the composer", async () => {
    sessionState.user = null;
    const { default: FeedPage } = await import("./feed/page");
    render(<FeedPage />);

    expect(screen.getByText("Please sign in to see your feed.")).toBeInTheDocument();
    expect(screen.queryByTestId("composer")).not.toBeInTheDocument();
  });
});
