import { z } from "zod";
import { getGemini, geminiModel } from "./gemini";
import { baselineSystemPrompt } from "./prompts";
import { planSchema, type GroupInput, type Plan } from "../schemas";

/** Same task, Qloo disabled: plain Gemini with no tools and no grounding. */
export async function runBaseline(input: GroupInput): Promise<Plan> {
  const { $schema: _s, ...schema } = z.toJSONSchema(planSchema, { io: "input" }) as Record<string, unknown>;
  void _s;
  const res = await getGemini().models.generateContent({
    model: geminiModel(),
    contents: "Plan the event.",
    config: {
      systemInstruction: baselineSystemPrompt(input),
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: 0.4,
    },
  });
  const parsed = planSchema.parse(JSON.parse(res.text ?? "{}"));
  // Strip any entityId the model may have hallucinated: the baseline is explicitly ungrounded.
  const strip = <T extends { entityId?: string }>(p: T): T => ({ ...p, entityId: undefined });
  return {
    ...parsed,
    venue: strip(parsed.venue),
    activity: strip(parsed.activity),
    film: parsed.film && strip(parsed.film),
    playlist: { ...parsed.playlist, artists: parsed.playlist.artists.map(strip) },
  };
}
