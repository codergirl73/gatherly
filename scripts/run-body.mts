// Usage: npx tsx --env-file=.env.local scripts/run-body.mts path/to/group.json
import { readFileSync } from "node:fs";
import { groupInputSchema } from "../src/lib/schemas";
import { QlooClient } from "../src/lib/qloo/client";
import { runAgent } from "../src/lib/agent/loop";

const input = groupInputSchema.parse(JSON.parse(readFileSync(process.argv[2], "utf8")));
const qloo = new QlooClient({ apiKey: process.env.QLOO_API_KEY! });
const t = Date.now();
try {
  const { plan } = await runAgent({ input, qloo, emit: (e) => (e.type === "step" ? console.log("[step]", e.message) : null) });
  console.log("OK", plan.title, `${Date.now() - t}ms`);
} catch (e) {
  console.log("FAILED after", Date.now() - t, "ms:", e instanceof Error ? e.message.slice(0, 600) : e);
}
