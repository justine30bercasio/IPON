import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

export async function POST() {
  const redirect = NextResponse.json({ ok: true });
  redirect.headers.set("Set-Cookie", await clearSessionCookieHeader());
  return redirect;
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}