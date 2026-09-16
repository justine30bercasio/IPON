import { NextResponse } from "next/server";
import { registerUser, validateNewPassword, sessionCookieHeader } from "@/lib/auth";

function docRedirect(target: string, cookie: string | null) {
  const head: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (cookie) head["Set-Cookie"] = cookie;
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${target}"><title>Redirecting&hellip;</title></head><body><a href="${target}">Continue</a></body></html>`,
    { status: 200, headers: head }
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const fail = (msg: string) => docRedirect(`/register?error=${encodeURIComponent(msg)}`, null);
  if (name.length < 2) return fail("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Enter a valid email address.");
  }
  if (username.length < 3) return fail("Username must be at least 3 characters.");
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return fail(pwCheck);

  const res = await registerUser({ name, email, username, password });
  if (!res.ok) return fail(res.error);
  const cookie = await sessionCookieHeader(res.user.id);
  return docRedirect("/dashboard", cookie);
}