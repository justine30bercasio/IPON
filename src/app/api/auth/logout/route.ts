import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await destroySession();
  const url = new URL("/login", request.nextUrl);
  url.searchParams.set("loggedOut", "1");
  return NextResponse.redirect(url);
}