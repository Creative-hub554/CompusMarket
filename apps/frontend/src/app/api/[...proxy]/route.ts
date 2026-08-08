import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const JWT_SECRET: string = process.env.AUTH_SECRET || process.env.JWT_SECRET || "";

async function proxy(req: NextRequest) {
  const incomingAuth = req.headers.get("authorization");
  let authHeader: string | null = incomingAuth;

  if (!authHeader && JWT_SECRET) {
    const token = await getToken({ req });
    if (token?.sub) {
      authHeader = `Bearer ${jwt.sign({ sub: token.sub }, JWT_SECRET, { expiresIn: "5m" })}`;
    }
  }

  const path = req.nextUrl.pathname.replace(/^\/api/, "");
  const target = `${API_BASE}${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  ["host", "expect", "connection", "keep-alive", "transfer-encoding", "upgrade", "proxy-authenticate", "proxy-authorization", "te", "trailer", "content-length"].forEach((h) =>
    headers.delete(h),
  );
  if (authHeader) headers.set("authorization", authHeader);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.arrayBuffer(),
    cache: "no-store",
  });

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
  proxy as HEAD,
};
