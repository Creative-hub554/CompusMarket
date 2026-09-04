import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const JWT_SECRET: string = process.env.AUTH_SECRET || process.env.JWT_SECRET || "";
  if (!JWT_SECRET) {
    return NextResponse.json({ error: "JWT_SECRET or AUTH_SECRET must be configured" }, { status: 500 });
  }

  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wsToken = jwt.sign({ sub: token.sub }, JWT_SECRET, { expiresIn: "5m" });

  return NextResponse.json({ token: wsToken });
}
