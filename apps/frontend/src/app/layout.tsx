import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import SessionWrapper from "@/components/SessionWrapper";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a237e",
};

export const metadata: Metadata = {
  title: "KHMERONLINESHOP",
  description: "Smart Commerce & Community Platform for Cambodia",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "KHMERONLINESHOP" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <SessionWrapper>
          <Nav />
          <main>{children}</main>
        </SessionWrapper>
      </body>
    </html>
  );
}
