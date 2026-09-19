import { loginUser, sessionCookieHeader } from "@/lib/auth";
import { isSameOrigin, jsonResponse } from "@/lib/route-helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isSameOrigin(request, url)) {
    return jsonResponse({ ok: false, error: "Cross-site requests are not allowed." });
  }

  if (!(await rateLimit("login", 10))) {
    return jsonResponse({ ok: false, error: "Too many attempts. Try again in a few minutes." });
  }

  const form = await request.formData();
  const emailOrUsername = String(form.get("emailOrUsername") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";

  if (!emailOrUsername || !password) {
    return jsonResponse({ ok: false, error: "Enter your email/username and password." });
  }
  const res = await loginUser(emailOrUsername, password, remember);
  if (!res.ok) return jsonResponse({ ok: false, error: res.error });
  const cookie = await sessionCookieHeader(
    res.user.id,
    remember,
    res.sessionVersion ?? 0
  );
  return jsonResponse({ ok: true, user: res.user }, { "Set-Cookie": cookie });
}