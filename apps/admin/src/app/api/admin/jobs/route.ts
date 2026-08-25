import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status === "OPEN" || status === "CLOSED") where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
      { location: { contains: q } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      type: true,
      status: true,
      salaryMin: true,
      salaryMax: true,
      createdAt: true,
      postedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}
