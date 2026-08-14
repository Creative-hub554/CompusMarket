import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = ["ADMIN", "CONTENT_EDITOR"];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (!token?.sub) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = typeof token.role === "string" ? token.role : "";
  if (!ADMIN_ROLES.includes(role)) {
    // Authenticated but lacking an admin role: send to the storefront.
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
