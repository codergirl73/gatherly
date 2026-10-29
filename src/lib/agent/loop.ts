import { z } from "zod";
import type { Content, FunctionDeclaration, Part as GPart } from "@google/genai";
import { generateWithRetry } from "./gemini";
import { agentSystemPrompt } from "./prompts";
import { groundPlan } from "./grounding";
import { RunContext, compareTastes, getInsights, resolveEntities, type Part } from "./tools";
import { planSchema, type AgentEvent, type GroupInput } from "../schemas";
import { QlooError } from "../qloo/types";
import type { QlooClient } from "../qloo/client";

const planJsonSchema = (() => {
  const { $schema: _s, ...rest } = z.toJSONSchema(planSchema, { io: "input" }) as Record<string, unknown>;
  void _s;
  return rest;
})();

const tools: FunctionDeclaration[] = [
  {
    name: "resolve_entities",
    description: "Resolve every group member's favorites to Qloo entity IDs via Qloo /search. Call once at the start. Returns match counts, cuisine hints, unresolved and uncertain matches.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "compare_tastes",
    description: "Measure where the group's tastes overlap and differ (Qloo analysis/compare). Call once after resolve_entities.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "get_insights",
    description: "Get Qloo recommendations for one part of the event, ranked by how many members each fits. venue = restaurants in the event city; playlist = artists; activity = non-restaurant places in the event city; film = movies. The city and budget are applied automatically.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        part: { type: "string", enum: ["venue", "playlist", "activity", "film"] },
        cuisine: { type: "string", description: "Optional cuisine keyword for venue, e.g. 'italian'" },
      },
      required: ["part"],
    },
  },
  {
    name: "build_plan",
    description: "Submit the final plan. Picks must use entity_id values returned by get_insights. Returns validation errors to fix, or ok.",
    parametersJsonSchema: planJsonSchema,
  },
];

export interface RunOptions {
  input: GroupInput;
  qloo: QlooClient;
  emit: (e: AgentEvent) => void;
  maxTurns?: number;
}

/** The Qloo-grounded agent loop: Gemini decides tool order; tools hit Qloo; build_plan is validated and grounded. */
export async function runAgent({ input, qloo, emit, maxTurns = 9 }: RunOptions) {
  const ctx = new RunContext(input, qloo, emit);
  const contents: Content[] = [{ role: "user", parts: [{ text: "Plan the event. Start now." }] }];
  let planRetries = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await generateWithRetry({
      contents,
      config: {
        systemInstruction: agentSystemPrompt(input),
        tools: [{ functionDeclarations: tools }],
        temperature: 0.4,
      },
    });
    const modelContent = res.candidates?.[0]?.content;
    const calls = res.functionCalls ?? [];
    if (!modelContent) throw new Error("Gemini returned no content");
    contents.push(modelContent);

    if (!calls.length) {
      contents.push({ role: "user", parts: [{ text: "Continue: use the tools, and finish by calling build_plan." }] });
      continue;
    }

    let finished: ReturnType<typeof groundPlan> | undefined;
    const responses: GPart[] = await Promise.all(
      calls.map(async (call): Promise<GPart> => {
        const name = call.name ?? "";
        const respond = (response: Record<string, unknown>): GPart => ({ functionResponse: { name, response } });
        try {
          switch (name) {
            case "resolve_entities":
              return respond(await resolveEntities(ctx));
            case "compare_tastes":
              if (!ctx.resolved.length) return respond({ error: "Call resolve_entities first." });
              return respond(await compareTastes(ctx));
            case "get_insights": {
              const a = (call.args ?? {}) as { part?: Part; cuisine?: string };
              if (!a.part || !["venue", "playlist", "activity", "film"].includes(a.part)) return respond({ error: "part must be venue|playlist|activity|film" });
              if (!ctx.resolved.length) return respond({ error: "Call resolve_entities first." });
              return respond(await getInsights(ctx, a.part, a.cuisine));
            }
            case "build_plan": {
              emit({ type: "step", message: "Writing the plan and checking every pick against Qloo…" });
              const g = groundPlan(call.args, ctx);
              if (g.ok) {
                finished = g;
                return respond({ ok: true });
              }
              return respond({ ok: false, errors: g.errors });
            }
            default:
              return respond({ error: `Unknown tool ${name}` });
          }
        } catch (e) {
          if (e instanceof QlooError && (e.kind === "unauthorized" || e.kind === "rate_limited")) throw e;
          return respond({ error: e instanceof Error ? e.message : "tool failed" });
        }
      }),
    );

    if (finished?.plan) {
      emit({ type: "plan", plan: finished.plan, evidence: finished.evidence });
      return { plan: finished.plan, ctx };
    }
    if (calls.some((c) => c.name === "build_plan") && ++planRetries > 2) break;
    contents.push({ role: "user", parts: responses });
  }
  throw new Error("The planner could not produce a grounded plan. Please try again.");
}
