import { groupInputSchema } from "@/lib/schemas";
import { runBaseline } from "@/lib/agent/baseline";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** The same task with Qloo disabled (LLM only), for the side-by-side comparison. */
export async function POST(req: Request) {
  const parsed = groupInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid group" }, { status: 400 });
  if (!rateLimit(`b:${clientIp(req)}`, 30).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    return Response.json({ plan: await runBaseline(parsed.data) });
  } catch (e) {
    console.error("baseline failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "The LLM-only plan failed. Try again." }, { status: 502 });
  }
}
