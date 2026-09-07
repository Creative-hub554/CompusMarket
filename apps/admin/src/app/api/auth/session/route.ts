import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth";

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: token.sub,
      email: token.email,
      name: token.name,
      image: token.image,
      role: token.role,
    },
  });
}