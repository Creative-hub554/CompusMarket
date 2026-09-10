import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/require-admin";
import { getApiBase } from "@/lib/backend";

/**
 * Admin product create. The page posts here; requireAdmin authenticates and
 * role-checks against the DB, then the route relays to the Nest backend with
 * the Clerk session token as the Bearer credential — the backend's
 * JwtOrClerkGuard verifies it and resolves the local user by clerkId.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN", "INVENTORY_MANAGER"]);
  if (!guard.ok) return guard.response;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { getToken } = await auth();
  const sessionToken = await getToken();
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${getApiBase()}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}