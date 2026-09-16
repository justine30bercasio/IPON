import { NextResponse } from "next/server";
import { resetPassword, validateNewPassword, sessionCookieHeader } from "@/lib/auth";

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
  const token = String(form.get("token") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const fail = (msg: string) => docRedirect(`/forgot-password?error=${encodeURIComponent(msg)}`, null);
  if (password !== confirm) return fail("Passwords don't match.");
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return fail(pwCheck);

  const res = await resetPassword(token, password);
  if (!res.ok) return fail(res.error);
  const cookie = await sessionCookieHeader(res.user.id);
  return docRedirect("/dashboard", cookie);
}