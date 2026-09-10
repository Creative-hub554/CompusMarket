import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import { requireAdmin } from "@/lib/require-admin";

const SLOTS = ["LEFT", "RIGHT", "BOTTOM"] as const;
const CURRENCIES = ["USD", "KHR"] as const;

function isSlot(value: unknown): value is (typeof SLOTS)[number] {
  return typeof value === "string" && SLOTS.includes(value as (typeof SLOTS)[number]);
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const pricing = await prisma.adSlotPricing.findMany({
    orderBy: { slot: "asc" },
  });

  return NextResponse.json(pricing);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isSlot(body.slot)) {
    return NextResponse.json({ error: "A valid ad slot is required" }, { status: 400 });
  }

  const price = Number(body.price);
  const durationMinutes = Number(body.durationMinutes);
  const currency = String(body.currency || "").toUpperCase();
  const isActive = body.isActive === undefined ? true : body.isActive === true;

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be greater than zero" }, { status: 400 });
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: "Duration must be a positive whole number of minutes" }, { status: 400 });
  }
  if (!CURRENCIES.includes(currency as (typeof CURRENCIES)[number])) {
    return NextResponse.json({ error: "Currency must be USD or KHR" }, { status: 400 });
  }

  const pricing = await prisma.adSlotPricing.upsert({
    where: { slot: body.slot },
    update: { price, currency, durationMinutes, isActive },
    create: { slot: body.slot, price, currency, durationMinutes, isActive },
  });

  return NextResponse.json(pricing);
}
