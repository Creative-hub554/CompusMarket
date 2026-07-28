import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.AUTH_SECRET || process.env.JWT_SECRET || "";
if (!JWT_SECRET) throw new Error("JWT_SECRET or AUTH_SECRET must be configured");

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wsToken = jwt.sign({ sub: token.sub }, JWT_SECRET, { expiresIn: "5m" });

  return NextResponse.json({ token: wsToken });
}
