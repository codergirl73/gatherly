// Usage: npx tsx --env-file=.env.local scripts/run-preset.mts [preset-id] [--baseline]
import { PRESETS } from "../src/lib/presets";
import { QlooClient } from "../src/lib/qloo/client";
import { runAgent } from "../src/lib/agent/loop";
import { runBaseline } from "../src/lib/agent/baseline";

const id = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "lisbon-remote";
const preset = PRESETS.find((p) => p.id === id);
if (!preset) throw new Error(`Unknown preset ${id}: ${PRESETS.map((p) => p.id).join(", ")}`);
if (process.argv.includes("--baseline")) {
  console.log(JSON.stringify(await runBaseline(preset.group), null, 1));
} else {
  const qloo = new QlooClient({ apiKey: process.env.QLOO_API_KEY! });
  const t = Date.now();
  const { plan } = await runAgent({ input: preset.group, qloo, emit: (e) => e.type === "step" || e.type === "warning" ? console.log(`[${e.type}]`, e.message) : e.type === "overlap" ? console.log("[overlap] score", e.overlap.groupScore, e.overlap.source, "shared:", e.overlap.shared.slice(0, 6).map((s) => s.label)) : null });
  console.log(JSON.stringify(plan, null, 1));
  console.log(`\n${Date.now() - t}ms, ${qloo.requestCount} Qloo requests`);
}
