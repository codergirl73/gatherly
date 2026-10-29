import { describe, expect, it, vi } from "vitest";
import { RunContext, getInsights } from "../src/lib/agent/tools";
import type { QlooClient } from "../src/lib/qloo/client";
import type { QlooEntity } from "../src/lib/qloo/types";
import { groupInputSchema } from "../src/lib/schemas";

const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const artist = (id: string, name: string, tags: string[], tagIds: string[] = []): QlooEntity => ({ id, name, type: "urn:entity:artist", tags, tagIds });

describe("match evidence", () => {
  const input = groupInputSchema.parse({
    eventType: "birthday", city: "London", budget: "$$",
    people: [
      { name: "Priya", favorites: [{ name: "Radiohead", category: "music", entityId: ID(1), tags: [{ id: "urn:tag:genre:indie", name: "Indie" }] }] },
      { name: "Chen", favorites: [{ name: "Tame Impala", category: "music", entityId: ID(2) }] },
    ],
  });

  const setup = (candidates: QlooEntity[]) => {
    const insights = vi.fn(async () => candidates);
    const ctx = new RunContext(input, { insights, searchTags: vi.fn(async () => []) } as unknown as QlooClient, () => {});
    ctx.resolved = [
      { personName: "Priya", inputName: "Radiohead", category: "music", entityId: ID(1), name: "Radiohead", matchedName: "Radiohead", uncertain: false, tags: ["Indie"], tagIds: ["urn:tag:genre:indie"] },
      { personName: "Chen", inputName: "Tame Impala", category: "music", entityId: ID(2), name: "Tame Impala", matchedName: "Tame Impala", uncertain: false, tags: [], tagIds: [] },
    ];
    ctx.personThemes = { Chen: new Set(["psychedelic", "dreamy", "place"]) };
    return ctx;
  };

  it("cites the favorite and shared tags when tag ids overlap", async () => {
    const ctx = setup([artist(ID(10), "Fleet Foxes", ["Indie", "Folk"], ["urn:tag:genre:indie"])]);
    await getInsights(ctx, "playlist");
    expect(ctx.candidates.get(ID(10))!.evidence.Priya).toEqual(["Radiohead → Indie"]);
  });

  it("falls back to shared taste themes by name, ignoring generic tags", async () => {
    const ctx = setup([artist(ID(11), "Khruangbin", ["Dreamy", "Place", "Funk"])]);
    await getInsights(ctx, "playlist");
    expect(ctx.candidates.get(ID(11))!.evidence.Chen).toEqual(["Shared taste themes: Dreamy"]);
  });

  it("uses the generic statement only when nothing is shared", async () => {
    const ctx = setup([artist(ID(12), "Someone", ["Jazz"])]);
    await getInsights(ctx, "playlist");
    expect(ctx.candidates.get(ID(12))!.evidence.Chen[0]).toMatch(/overall taste profile/);
  });
});
