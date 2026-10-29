import { getQlooClient } from "@/lib/qloo/client";
import { QlooError } from "@/lib/qloo/types";
import { SUGGEST_TYPES, toSuggestion } from "@/lib/suggest";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/** Typeahead for the group builder: Qloo /search across favorite categories. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return Response.json({ results: [] });
  if (!rateLimit(`s:${clientIp(req)}`, 120, 60_000).ok) return Response.json({ results: [], error: "slow_down" }, { status: 429 });
  try {
    const entities = await getQlooClient().search(q, { types: SUGGEST_TYPES, take: 12 });
    const seen = new Set<string>();
    const results = entities
      .map(toSuggestion)
      .filter((s): s is NonNullable<typeof s> => !!s)
      .filter((s) => {
        const k = `${s.category}:${s.name.toLowerCase()}`;
        return seen.has(k) ? false : (seen.add(k), true);
      })
      .slice(0, 7);
    return Response.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    const kind = e instanceof QlooError ? e.kind : "unknown";
    return Response.json({ results: [], error: kind }, { status: kind === "rate_limited" ? 429 : 502 });
  }
}
