import { resetPassword, validateNewPassword, sessionCookieHeader } from "@/lib/auth";
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
    return docRedirect("/forgot-password?error=Cross-site%20requests%20are%20not%20allowed.", null);
  }

  if (!(await rateLimit("reset", 5))) {
    if (wantsJson(request)) {
      return jsonResponse({ ok: false, error: "Too many attempts. Try again later." });
    }
    return docRedirect("/forgot-password?error=Too%20many%20attempts.%20Try%20again%20later.", null);
  }

  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const fail = (msg: string) =>
    wantsJson(request)
      ? jsonResponse({ ok: false, error: msg })
      : docRedirect(`/forgot-password?error=${encodeURIComponent(msg)}`, null);
  if (password !== confirm) return fail("Passwords don't match.");
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return fail(pwCheck);

  const res = await resetPassword(token, password);
  if (!res.ok) return fail(res.error);
  const cookie = await sessionCookieHeader(res.user.id, true, res.sessionVersion ?? 0);
  if (wantsJson(request)) {
    return jsonResponse({ ok: true, user: res.user }, { "Set-Cookie": cookie });
  }
  return docRedirect("/dashboard", cookie);
}