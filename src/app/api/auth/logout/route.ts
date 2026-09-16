import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const redirect = NextResponse.json({ ok: true });
  redirect.headers.set("Set-Cookie", await clearSessionCookieHeader());
  return redirect;
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}