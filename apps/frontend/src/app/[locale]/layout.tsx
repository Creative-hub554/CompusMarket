import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toast";
import SessionWrapper from "@/components/SessionWrapper";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { ChatDockProvider } from "@/components/chat/ChatDock";
import { SentryInit } from "@/components/SentryInit";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";
import { SITE_NAME, SITE_DESCRIPTION, getSiteUrl, languageAlternates } from "@/lib/site";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansKhmer = Noto_Sans_Khmer({
  subsets: ["khmer"],
  variable: "--font-khmer",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e1b4b",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: languageAlternates("/"),
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "km_KH",
    alternateLocale: ["en_US"],
    images: [{ url: "/champey-og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/champey-og.png"],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${notoSansKhmer.variable}`} suppressHydrationWarning>
      <body className="min-h-screen text-gray-900 dark:text-slate-200 antialiased">
        <OrganizationJsonLd />
        <ThemeProvider>
          <SessionWrapper>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <Toaster />
                <Nav />
                <main className="min-h-[calc(100vh-4rem)]">{children}</main>
                <Footer />
                <AiAssistant />
                <ChatDockProvider />
                <SentryInit />
              </NextIntlClientProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
