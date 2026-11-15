import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { env } from "@/lib/config/env";

export async function POST() {
  const response = NextResponse.json({ success: true, data: null }, { status: 200 });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
