import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== token.sub)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(resume);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== token.sub)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const updated = await prisma.resume.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.data && { data: body.data }),
      ...(body.template && { template: body.template }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume || resume.userId !== token.sub)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.resume.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
