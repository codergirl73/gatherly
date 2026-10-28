import { describe, expect, it } from "vitest";
import { QlooClient } from "../../src/lib/qloo/client";
import { ENTITY_TYPES, PLACE_TAGS } from "../../src/lib/qloo/types";
import { PRESETS } from "../../src/lib/presets";
import { RunContext, getInsights, resolveEntities } from "../../src/lib/agent/tools";

const key = process.env.QLOO_API_KEY;
const live = describe.skipIf(!key);

const cityOf = (e: { city?: string; neighborhood?: string }) => `${e.city ?? ""} ${e.neighborhood ?? ""}`.toLowerCase();

live("Qloo live API (hackathon host)", () => {
  const qloo = new QlooClient({ apiKey: key! });

  it("/search resolves a known artist to an id", async () => {
    const r = await qloo.search("Radiohead", { types: ENTITY_TYPES.artist, take: 3 });
    expect(r[0].name).toBe("Radiohead");
    expect(r[0].id).toBeTruthy();
  });

  it.each([
    ["Lisbon", "lisbon"],
    ["London", "london"],
    ["New York", "new york"],
  ])("place insights for %s are actually located in that city", async (city, needle) => {
    const places = await qloo.insights({ type: ENTITY_TYPES.place, location: city, take: 20 });
    expect(places.length).toBeGreaterThan(5);
    const inCity = places.filter((p) => cityOf(p).includes(needle)).length;
    // Qloo's locality boundary is slightly expanded, so require a strong majority, not 100%.
    expect(inCity / places.length).toBeGreaterThanOrEqual(0.7);
  });

  it("the location filter changes results (it is not silently ignored)", async () => {
    const [a, b] = await Promise.all([
      qloo.insights({ type: ENTITY_TYPES.place, location: "Lisbon", take: 10 }),
      qloo.insights({ type: ENTITY_TYPES.place, location: "London", take: 10 }),
    ]);
    const overlap = a.filter((x) => b.some((y) => y.id === x.id));
    expect(overlap).toHaveLength(0);
  });

  it("the tag filter changes results (restaurants vs. unfiltered)", async () => {
    const [all, rest] = await Promise.all([
      qloo.insights({ type: ENTITY_TYPES.place, location: "London", take: 10 }),
      qloo.insights({ type: ENTITY_TYPES.place, location: "London", take: 10, extra: { "filter.tags": PLACE_TAGS.restaurant } }),
    ]);
    expect(rest.map((r) => r.id)).not.toEqual(all.map((r) => r.id));
  });

  it("a preset group produces venue and activity candidates in its chosen city", async () => {
    const preset = PRESETS.find((p) => p.id === "lisbon-remote")!;
    const ctx = new RunContext(preset.group, qloo, () => {});
    await resolveEntities(ctx);
    expect(ctx.resolved.length).toBeGreaterThan(8);
    for (const part of ["venue", "activity"] as const) {
      const r = await getInsights(ctx, part);
      expect(r.candidates.length).toBeGreaterThan(0);
      const inCity = r.candidates.filter((c) => (c.city ?? "").toLowerCase().includes("lisbon")).length;
      expect(inCity).toBeGreaterThanOrEqual(Math.ceil(r.candidates.length * 0.6));
    }
  });
});
