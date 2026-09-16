import { NextResponse } from "next/server";
import { loginUser, sessionCookieHeader } from "@/lib/auth";

const json = (body: Record<string, unknown>, extra: HeadersInit = {}) =>
  new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });

export async function POST(request: Request) {
  const form = await request.formData();
  const emailOrUsername = String(form.get("emailOrUsername") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";

  if (!emailOrUsername || !password) {
    return json({ ok: false, error: "Enter your email/username and password." });
  }
  const res = await loginUser(emailOrUsername, password, remember);
  if (!res.ok) return json({ ok: false, error: res.error });
  const cookie = await sessionCookieHeader(res.user.id, remember);
  return json({ ok: true, user: res.user }, { "Set-Cookie": cookie });
}