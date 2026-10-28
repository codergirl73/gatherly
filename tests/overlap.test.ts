import { describe, expect, it } from "vitest";
import { computeOverlap } from "../src/lib/overlap";

const t = (id: string, name = id) => ({ id: `urn:tag:style:qloo:${id}`, name });

describe("computeOverlap", () => {
  const overlap = computeOverlap({
    Ana: [t("indie"), t("moody"), t("brazilian")],
    Liam: [t("indie"), t("moody"), t("folk")],
    Yuki: [t("indie"), t("ambient")],
  });

  it("finds themes shared by 2+ people, most-shared first", () => {
    expect(overlap.shared[0]).toMatchObject({ id: "urn:tag:style:qloo:indie", people: ["Ana", "Liam", "Yuki"] });
    expect(overlap.shared.map((s) => s.id)).toContain("urn:tag:style:qloo:moody");
  });

  it("keeps single-person themes as individual", () => {
    expect(overlap.individual.Ana.map((s) => s.id)).toEqual(["urn:tag:style:qloo:brazilian"]);
    expect(overlap.individual.Yuki.map((s) => s.id)).toEqual(["urn:tag:style:qloo:ambient"]);
  });

  it("scores pairs by Jaccard similarity", () => {
    const pair = overlap.pairs.find((p) => p.a === "Ana" && p.b === "Liam")!;
    expect(pair.score).toBe(50); // 2 shared / 4 total
    expect(overlap.pairs).toHaveLength(3);
  });

  it("computes group overlap as share of each profile that others also carry", () => {
    // Ana 2/3, Liam 2/3, Yuki 1/2 -> avg ~61
    expect(overlap.groupScore).toBe(61);
  });

  it("ignores generic place/price noise tags", () => {
    const o = computeOverlap({
      A: [{ id: "urn:tag:genre:place:restaurant", name: "Restaurant" }],
      B: [{ id: "urn:tag:genre:place:restaurant", name: "Restaurant" }],
    });
    expect(o.shared).toEqual([]);
  });

  it("handles empty input", () => {
    expect(computeOverlap({}).groupScore).toBe(0);
  });
});
