"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

export type BridgeUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role?: string;
};

export type BridgeSession = {
  user: BridgeUser;
  accessToken?: string;
  expires?: string;
};

type Status = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  data: BridgeSession | null;
  status: Status;
  update: () => Promise<BridgeSession | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: "loading",
  update: async () => null,
  signOut: async () => {},
});

async function fetchBridgeSession(): Promise<BridgeSession | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json()) as BridgeSession | null;
  return body?.user ? body : null;
}

/**
 * Bridges Clerk sessions to the app's local user records so components can
 * keep using the familiar `useSession()` shape: session.user.id is the local
 * DB uuid and session.user.role comes from the database.
 */
export function SessionBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [session, setSession] = useState<BridgeSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setSession(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetchBridgeSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const update = useCallback(async () => {
    const s = await fetchBridgeSession().catch(() => null);
    setSession(s);
    setReady(true);
    return s;
  }, []);

  const signOut = useCallback(async () => {
    await clerk.signOut();
  }, [clerk]);

  const status: Status = !isLoaded ? "loading" : !isSignedIn ? "unauthenticated" : !ready ? "loading" : session ? "authenticated" : "unauthenticated";

  const value = useMemo(
    () => ({ data: session, status, update, signOut }),
    [session, status, update, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
