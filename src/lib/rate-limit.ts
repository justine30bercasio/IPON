import { headers } from "next/headers";

const WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 8;

const hits = new Map<string, number[]>();

export async function rateLimit(
  key: string,
  limit: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): Promise<boolean> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const fullKey = `${ip}:${key}`;
  const now = Date.now();
  const recent = (hits.get(fullKey) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(fullKey, recent);
    return false;
  }
  recent.push(now);
  hits.set(fullKey, recent);
  return true;
}