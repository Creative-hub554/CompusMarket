import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const JWT_SECRET: string = process.env.JWT_SECRET || process.env.AUTH_SECRET || "";
if (!JWT_SECRET) throw new Error("JWT_SECRET or AUTH_SECRET must be configured");

// Paths the proxy is allowed to forward (relative to the incoming /api route).
const ALLOWED_PREFIXES = [
  "/api/ai",
  "/api/resumes",
  "/api/notes",
  "/api/flashcards",
  "/api/quizzes",
  "/api/diagrams",
  "/api/documents",
  "/api/articles",
  "/api/threads",
  "/api/posts",
  "/api/groups",
  "/api/feed",
  "/api/profiles",
  "/api/users",
  "/api/suggestions",
  "/api/stories",
  "/api/notifications",
  "/api/support",
  "/api/warranties",
  "/api/upload",
  "/api/search",
  "/api/categories",
  "/api/products",
  "/api/orders",
  "/api/jobs",
  "/api/cart",
  "/api/health",
  // Added ads proxy
  "/api/ads",
];

const HOP_BY_HOP_HEADERS = [
  "host",
  "expect",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
];

async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAllowed = ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (!isAllowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Never trust the client-supplied Authorization header. Derive identity from
  // the NextAuth session cookie and re-sign a short-lived backend JWT instead.
  const token = await getToken({ req });
  let authHeader: string | null = null;
  if (token?.sub) {
    const payload: any = { sub: token.sub };
    if (token.email) payload.email = token.email;
    if ((token as any).role) payload.role = (token as any).role;
    const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: "5m" });
    authHeader = 'Bearer ' + signed;
  }

  const targetPath = path.replace(/^\/api/, "");
  const target = API_BASE + targetPath + req.nextUrl.search;

  // Clone request headers but drop hop-by-hop and cookies. Then set our authorization.
  const headers = new Headers();
  for (const [k, v] of req.headers) {
    const key = k.toLowerCase();
    if (key === "cookie") continue;
    if (HOP_BY_HOP_HEADERS.includes(key)) continue;
    headers.set(k, v as string);
  }
  if (authHeader) headers.set("authorization", authHeader);

  let res: Response;
  try {
    res = await fetch(target, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : await req.arrayBuffer(),
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json({ error: "Upstream service unavailable" }, { status: 502 });
  }

  const body = await res.arrayBuffer();
  const responseHeaders = new Headers();
  const contentType = res.headers.get("content-type");
  const contentDisposition = res.headers.get("content-disposition");
  if (contentType) responseHeaders.set("content-type", contentType);
  if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);

  return new NextResponse(body, {
    status: res.status,
    headers: responseHeaders,
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
