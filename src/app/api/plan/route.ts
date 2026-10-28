import { groupInputSchema, type AgentEvent } from "@/lib/schemas";
import { getQlooClient } from "@/lib/qloo/client";
import { QlooError } from "@/lib/qloo/types";
import { runAgent } from "@/lib/agent/loop";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const errorEvent = (e: unknown): AgentEvent => {
  if (e instanceof QlooError) {
    if (e.kind === "rate_limited") return { type: "error", kind: "rate_limited", message: "Qloo is busy right now. Give it a minute and try again." };
    if (e.kind === "unauthorized") return { type: "error", kind: "config", message: "The Qloo API key is missing or rejected on this server." };
    return { type: "error", kind: "unavailable", message: "We couldn't reach Qloo. Please try again shortly." };
  }
  const msg = e instanceof Error ? e.message : "";
  if (/GOOGLE_CLOUD_PROJECT|credential|permission|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg))
    return { type: "error", kind: "config", message: "The planning model isn't configured correctly on this server." };
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return { type: "error", kind: "rate_limited", message: "The planner is busy right now. Try again in a minute." };
  return { type: "error", kind: "unknown", message: "Something went wrong while planning. Please try again." };
};

/** Streams agent progress as newline-delimited JSON events. */
export async function POST(req: Request) {
  const parsed = groupInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid group", issues: parsed.error.issues }, { status: 400 });
  const limit = rateLimit(clientIp(req));
  if (!limit.ok) return Response.json({ error: "Too many plans. Try again later.", retryAfter: limit.retryAfter }, { status: 429 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        await runAgent({ input: parsed.data, qloo: getQlooClient(), emit: send });
      } catch (e) {
        console.error("plan failed", e instanceof Error ? e.message : e);
        send(errorEvent(e));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
