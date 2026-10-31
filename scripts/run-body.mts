// Usage: npx tsx --env-file=.env.local scripts/run-body.mts path/to/group.json
import { readFileSync } from "node:fs";
import { groupInputSchema } from "../src/lib/schemas";
import { QlooClient } from "../src/lib/qloo/client";
import { runAgent } from "../src/lib/agent/loop";

const input = groupInputSchema.parse(JSON.parse(readFileSync(process.argv[2], "utf8")));
const qloo = new QlooClient({ apiKey: process.env.QLOO_API_KEY! });
const t = Date.now();
const at = () => `${((Date.now() - t) / 1000).toFixed(1)}s`;
try {
  const { plan } = await runAgent({ input, qloo, emit: (e) => (e.type === "step" ? console.log(at(), e.message) : null) });
  console.log(at(), "OK", plan.title, `| ${qloo.requestCount} Qloo requests`);
} catch (e) {
  console.log(at(), "FAILED:", e instanceof Error ? e.message.slice(0, 400) : e);
}
