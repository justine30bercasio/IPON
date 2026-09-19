import { registerUser, validateNewPassword, sessionCookieHeader } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  wantsJson,
  isSameOrigin,
  jsonResponse,
  docRedirect,
} from "@/lib/route-helpers";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isSameOrigin(request, url)) {
    if (wantsJson(request)) {
      return jsonResponse({ ok: false, error: "Cross-site requests are not allowed." });
    }
    return docRedirect("/register?error=Cross-site%20requests%20are%20not%20allowed.", null);
  }

  if (!(await rateLimit("register", 5))) {
    if (wantsJson(request)) {
      return jsonResponse({ ok: false, error: "Too many attempts. Try again later." });
    }
    return docRedirect("/register?error=Too%20many%20attempts.%20Try%20again%20later.", null);
  }

  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const fail = (msg: string) =>
    wantsJson(request)
      ? jsonResponse({ ok: false, error: msg })
      : docRedirect(`/register?error=${encodeURIComponent(msg)}`, null);
  if (name.length < 2) return fail("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Enter a valid email address.");
  }
  if (username.length < 3) return fail("Username must be at least 3 characters.");
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return fail(pwCheck);

  const res = await registerUser({ name, email, username, password });
  if (!res.ok) return fail(res.error);
  const cookie = await sessionCookieHeader(res.user.id, true, res.sessionVersion ?? 0);
  if (wantsJson(request)) {
    return jsonResponse({ ok: true, user: res.user }, { "Set-Cookie": cookie });
  }
  return docRedirect("/dashboard", cookie);
}