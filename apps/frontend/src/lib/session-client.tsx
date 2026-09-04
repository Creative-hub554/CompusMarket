"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";

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
  const { user } = useUser();
  const clerk = useClerk();
  const [session, setSession] = useState<BridgeSession | null>(null);
  const [ready, setReady] = useState(false);
  const loadedOnce = useRef(false);
  // Role changes made server-side (admin promote/demote/ban) are mirrored into
  // Clerk publicMetadata; the metadata claim is how this client notices them.
  const metadataRole = (user?.publicMetadata as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      loadedOnce.current = false;
      setSession(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetchBridgeSession()
      .then((s) => {
        if (cancelled) return;
        loadedOnce.current = true;
        setSession(s);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          loadedOnce.current = true;
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

  // When the Clerk client observes a publicMetadata.role change, re-fetch the
  // DB session so session.user.role (the authoritative value) flips without a
  // page reload. The first evaluation coincides with the initial load, so it
  // is skipped.
  useEffect(() => {
    if (!isSignedIn || !metadataRole) return;
    if (!loadedOnce.current) return;
    void update();
  }, [metadataRole, isSignedIn, update]);

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
