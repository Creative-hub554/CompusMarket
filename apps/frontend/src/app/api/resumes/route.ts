import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";
import { NextResponse } from "next/server";

export async function GET() {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resumes = await prisma.resume.findMany({
    where: { userId: token.sub },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(resumes);
}

export async function POST(req: Request) {
  const token = await getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const resume = await prisma.resume.create({
    data: {
      userId: token.sub,
      title: body.title || "My Resume",
      data: body.data || {},
      template: body.template || "modern",
    },
  });
  return NextResponse.json(resume);
}
