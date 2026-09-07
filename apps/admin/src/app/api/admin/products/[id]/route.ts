import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/require-admin";
import { getApiBase } from "@/lib/backend";

async function relay(
  req: NextRequest,
  id: string,
  allowedRoles: readonly string[],
  method: "PATCH" | "DELETE",
) {
  const guard = await requireAdmin(req, allowedRoles);
  if (!guard.ok) return guard.response;

  const { getToken } = await auth();
  const sessionToken = await getToken();
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  if (method === "PATCH") {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const res = await fetch(`${getApiBase()}/products/${id}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${sessionToken}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return relay(req, id, ["ADMIN", "INVENTORY_MANAGER"], "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return relay(req, id, ["ADMIN"], "DELETE");
}