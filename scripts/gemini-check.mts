// Usage: npx tsx --env-file=.env.local scripts/gemini-check.mts
import { getGemini, geminiModel } from "../src/lib/agent/gemini";

const t = Date.now();
try {
  const r = await getGemini().models.generateContent({
    model: geminiModel(),
    contents: "Reply with the single word: ok",
    config: { httpOptions: { timeout: 30_000 } },
  });
  console.log("model", geminiModel(), "->", r.text?.trim(), `(${Date.now() - t}ms)`);
} catch (e) {
  console.log("FAILED", geminiModel(), `(${Date.now() - t}ms):`, String((e as Error).message).slice(0, 300));
  process.exit(1);
}
