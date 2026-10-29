/** Tiny in-memory per-IP limiter (per server instance) to protect Qloo/Gemini quota during judging. */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 20, windowMs = 10 * 60 * 1000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return { ok: true, retryAfter: 0 };
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
