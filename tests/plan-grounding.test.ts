import { describe, expect, it } from "vitest";
import { groundPlan } from "../src/lib/agent/grounding";
import { RunContext, type Candidate } from "../src/lib/agent/tools";
import { groupInputSchema, planSchema } from "../src/lib/schemas";
import { PRESETS } from "../src/lib/presets";
import type { QlooClient } from "../src/lib/qloo/client";

const input = PRESETS[2].group;
const cand = (id: string, name: string, part: Candidate["part"], fits: string[]): Candidate => ({
  entity: { id, name, tags: [], tagIds: [], address: `${name} street` },
  part,
  fits,
  evidence: Object.fromEntries(fits.map((f) => [f, [`fav → tag`]])),
  cityMatch: true,
});

const ctxWith = (cands: Candidate[]) => {
  const ctx = new RunContext(input, {} as QlooClient, () => {});
  cands.forEach((c) => ctx.candidates.set(c.entity.id, c));
  return ctx;
};

const pick = (entityId: string, fits = ["Ana"]) => ({ entityId, name: "LLM name", why: "because", fits });
const plan = (over: Record<string, unknown> = {}) => ({
  title: "T",
  summary: "S",
  theme: { name: "n", description: "d", why: "w", fits: ["Ana", "Ghost"] },
  venue: { ...pick("v1", ["Ana", "Liam"]), cuisine: "Portuguese" },
  playlist: { direction: "dir", artists: [pick("a1"), pick("a2"), pick("a3")] },
  activity: pick("act1"),
  tradeoffs: [{ note: "n", between: ["Ana", "Nobody"], balancedAlternative: "alt" }],
  ...over,
});
const cands = () => [
  cand("v1", "Real Venue", "venue", ["Ana", "Liam"]),
  cand("a1", "A1", "playlist", ["Ana"]),
  cand("a2", "A2", "playlist", ["Ana"]),
  cand("a3", "A3", "playlist", ["Ana"]),
  cand("act1", "Act", "activity", ["Ana"]),
];

describe("groundPlan", () => {
  it("accepts a plan built from returned candidates and restores real names/addresses", () => {
    const r = groundPlan(plan(), ctxWith(cands()));
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.plan!.venue.name).toBe("Real Venue");
    expect(r.plan!.venue.address).toBe("Real Venue street");
    expect(r.plan!.theme.fits).toEqual(["Ana"]); // fake member removed
    expect(r.plan!.tradeoffs[0].between).toEqual(["Ana"]);
    expect(r.evidence.v1.length).toBeGreaterThan(0);
  });

  it("rejects an invented entity id", () => {
    const r = groundPlan(plan({ venue: { ...pick("made-up"), cuisine: "x" } }), ctxWith(cands()));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/not returned by get_insights/);
  });

  it("rejects a pick used for the wrong part of the event", () => {
    const r = groundPlan(plan({ activity: pick("v1") }), ctxWith(cands()));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/belongs to "venue"/);
  });

  it("rejects structurally invalid plans (zod)", () => {
    const r = groundPlan({ title: "only a title" }, ctxWith(cands()));
    expect(r.ok).toBe(false);
  });
});

describe("schemas", () => {
  it("validates all preset groups", () => {
    for (const p of PRESETS) expect(groupInputSchema.safeParse(p.group).success).toBe(true);
  });
  it("rejects a group of one and oversized groups", () => {
    expect(groupInputSchema.safeParse({ ...input, people: [input.people[0]] }).success).toBe(false);
    expect(groupInputSchema.safeParse({ ...input, people: [...input.people, ...input.people] }).success).toBe(false);
  });
  it("plan schema requires 3-6 playlist artists", () => {
    const bad = plan({ playlist: { direction: "d", artists: [pick("a1")] } });
    expect(planSchema.safeParse(bad).success).toBe(false);
  });
});
