"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useAuthSocket(userId: string | null | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let socket: Socket | null = null;
    fetch("/api/auth/token")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        socket = io(
          process.env.NEXT_PUBLIC_SOCKET_URL ||
            process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") ||
            "http://localhost:4000",
          {
            query: { token: d.token },
            transports: ["websocket", "polling"],
          },
        );
        socketRef.current = socket;
        forceRender((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      socket?.close();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const isVideo = file.type.startsWith("video/");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/upload/${isVideo ? "video" : "image"}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Upload failed");
  }
  return res.json();
}
