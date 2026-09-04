import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getToken } from "@/lib/auth";

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || "";
  const accessToken = JWT_SECRET
    ? jwt.sign(
        { sub: token.sub, email: token.email, role: token.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      )
    : undefined;

  return NextResponse.json({
    user: {
      id: token.sub,
      email: token.email,
      name: token.name,
      image: token.image,
      role: token.role,
    },
    accessToken,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}
