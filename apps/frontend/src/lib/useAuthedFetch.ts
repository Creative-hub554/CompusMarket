"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

export function useAuthedFetch() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  return useCallback(
    (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(path, { ...init, headers });
    },
    [accessToken]
  );
}
