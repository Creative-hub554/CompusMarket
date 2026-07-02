import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Theo Platform",
  description: "Smart Commerce & Community Platform for Cambodia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
