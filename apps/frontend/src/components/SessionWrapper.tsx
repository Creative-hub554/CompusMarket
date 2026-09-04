"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { SessionBridge } from "@/lib/session-client";

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <SessionBridge>{children}</SessionBridge>
    </ClerkProvider>
  );
}
