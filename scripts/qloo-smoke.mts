// Usage: npx tsx --env-file=.env.local scripts/qloo-smoke.mts
import { QlooClient } from "../src/lib/qloo/client";
import { ENTITY_TYPES } from "../src/lib/qloo/types";

const key = process.env.QLOO_API_KEY;
if (!key) throw new Error("Set QLOO_API_KEY in .env.local");
const q = new QlooClient({ apiKey: key });

const raw = await q.get("/search", { query: "Radiohead", take: 2 });
console.log("RAW /search sample:", JSON.stringify(raw, null, 1).slice(0, 1500));

const artists = await q.search("Radiohead", { take: 3 });
console.log("search ->", artists.map((a) => `${a.name} (${a.id})`));

const rawIns = await q.get("/v2/insights", {
  "filter.type": ENTITY_TYPES.place,
  "filter.location.query": "Lisbon",
  take: 2,
});
console.log("RAW /v2/insights sample:", JSON.stringify(rawIns, null, 1).slice(0, 2500));

const places = await q.insights({ type: ENTITY_TYPES.place, location: "Lisbon", take: 8 });
console.log("places in Lisbon ->", places.map((p) => `${p.name} | ${p.city ?? "?"} ${p.country ?? ""}`));
