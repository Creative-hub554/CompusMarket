import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SessionBridge } from "@/lib/session-client";
import { SentryInit } from "../components/SentryInit";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Admin - KHMERONLINESHOP",
  description: "KHMERONLINESHOP Administration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <ClerkProvider>
          <SessionBridge>{children}</SessionBridge>
        </ClerkProvider>
        <SentryInit />
      </body>
    </html>
  );
}