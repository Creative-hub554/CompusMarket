import { describe, it, expect, vi, beforeAll } from "vitest";
import React, { createElement } from "react";
import { prerender } from "react-dom/static";
import enMessages from "../../../messages/en.json";
import kmMessages from "../../../messages/km.json";

/*
 * SSR chrome smoke test — guards against the PR #16 regression class, where
 * the locale layout imported `Nav` but stopped rendering it. A page can load
 * fine while the chrome (search, cart, notifications, theme toggle, account
 * menu, locale switcher) silently vanishes, so we assert on the actual SSR
 * HTML instead of trusting "the route compiled".
 *
 * Strategy: render the REAL layout through react-dom/static's `prerender`,
 * mocking only providers with build-time or external side effects
 * (next/font, Clerk session, next-themes, sockets, next/navigation runtime).
 * next-intl stays real and is fed message catalogs for both locales.
 */

const state = vi.hoisted(() => ({ locale: "en" as string }));

const messagesByLocale = { en: enMessages, km: kmMessages };

// The layout imports globals.css; keep it out of the test bundle — vitest's
// Vite pipeline cannot load the project's PostCSS/Tailwind config.
vi.mock("../globals.css", () => ({}));

vi.mock("next/font/google", () => {
  const font = (o?: { variable?: string }) => ({
    variable: o?.variable ?? "--font-stub",
    className: "font-stub",
    style: {},
  });
  return {
    Inter: font,
    Noto_Sans_Khmer: font,
    Space_Grotesk: font,
    Fraunces: font,
  };
});

// SessionWrapper mounts the Clerk provider (needs keys + network) — passthrough.
vi.mock("@/components/SessionWrapper", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/session-client", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// NotificationsBell and ChatDock read `socketRef.current` during render, so the
// mock must return a real ref object (null would crash the deps array).
vi.mock("@/lib/social", () => ({
  timeAgo: () => "",
  useAuthSocket: () => ({ current: null }),
}));

vi.mock("next-intl/server", () => ({
  getMessages: () => Promise.resolve(messagesByLocale[state.locale]),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  notFound: vi.fn(),
  redirect: vi.fn(),
  useParams: () => ({ locale: state.locale }),
  usePathname: () => `/${state.locale}`,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  // JSDOM lacks matchMedia; theme code reads it in render/mount paths.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  }
});

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

async function renderLayoutToHtml(locale: "en" | "km"): Promise<string> {
  state.locale = locale;
  vi.resetModules();
  const { default: LocaleLayout } = await import("./layout");
  const element = createElement(
    LocaleLayout,
    { params: Promise.resolve({ locale }) },
    createElement("div", null, "page-content-stub"),
  );
  const { prelude } = await prerender(element, {
    onError(error) {
      throw error;
    },
  });
  return readAll(prelude);
}

describe("locale layout SSR chrome", () => {
  it.each(["en", "km"] as const)(
    "renders the full chrome in the SSR HTML for /%s",
    async (locale) => {
      const html = await renderLayoutToHtml(locale);

      // The Nav wrapper carries viewTransitionName "site-header" — the
      // single cheapest marker that <Nav /> is actually rendered.
      expect(html).toMatch(/view-transition-name:\s*site-header/);
      expect(html).toContain(`lang="${locale}"`);

      // Nav contents: wordmark, locale switcher buttons (literal text).
      expect(html).toContain(">champey<");
      expect(html).toContain(">EN<");
      expect(html).toContain("ខ្មែរ");

      // Footer renders its own <footer> element below <main>.
      expect(html).toContain("<footer");
      expect(html).toContain("page-content-stub");
    },
  );
});
