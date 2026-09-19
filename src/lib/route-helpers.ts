import { NextResponse } from "next/server";

export function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

export function isSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

export function jsonResponse(
  body: Record<string, unknown>,
  extra: HeadersInit = {}
): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

export function docRedirect(
  target: string,
  cookie: string | null
): NextResponse {
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