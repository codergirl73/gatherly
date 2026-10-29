import { describe, expect, it, vi } from "vitest";
import { RunContext, resolveEntities } from "../src/lib/agent/tools";
import { toSuggestion } from "../src/lib/suggest";
import { ENTITY_TYPES, type QlooEntity } from "../src/lib/qloo/types";
import type { QlooClient } from "../src/lib/qloo/client";
import { groupInputSchema } from "../src/lib/schemas";

const ID = "70CAE5BF-2F4C-445C-A3E5-4EDACFC3591C";

describe("resolveEntities", () => {
  it("skips the Qloo lookup for favorites already picked from suggestions", async () => {
    const search = vi.fn(async () => []);
    const qloo = { search, searchTags: vi.fn(async () => []) } as unknown as QlooClient;
    const input = groupInputSchema.parse({
      eventType: "birthday", city: "London", budget: "$$",
      people: [
        { name: "A", favorites: [{ name: "Radiohead", category: "music", entityId: ID, tags: [{ id: "urn:tag:genre:music:indie", name: "Indie" }] }] },
        { name: "B", favorites: [{ name: "Dune", category: "film", entityId: ID }] },
      ],
    });
    const ctx = new RunContext(input, qloo, () => {});
    await resolveEntities(ctx);
    expect(search).not.toHaveBeenCalled();
    expect(ctx.resolved).toHaveLength(2);
    expect(ctx.resolved[0]).toMatchObject({ entityId: ID, tags: ["Indie"], tagIds: ["urn:tag:genre:music:indie"], uncertain: false });
  });

  it("rejects a non-UUID entityId", () => {
    const r = groupInputSchema.safeParse({
      eventType: "birthday", city: "London", budget: "$$",
      people: [
        { name: "A", favorites: [{ name: "x", category: "music", entityId: "not-a-uuid" }] },
        { name: "B", favorites: [{ name: "y", category: "film" }] },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("toSuggestion", () => {
  const base = (over: Partial<QlooEntity>): QlooEntity => ({ id: ID, name: "X", tags: [], tagIds: [], ...over });

  it("maps entity types to favorite categories", () => {
    expect(toSuggestion(base({ type: ENTITY_TYPES.artist }))?.category).toBe("music");
    expect(toSuggestion(base({ type: ENTITY_TYPES.movie }))?.category).toBe("film");
    expect(toSuggestion(base({ type: ENTITY_TYPES.tvShow }))?.category).toBe("tv");
  });
  it("treats restaurant-like places and brands as food, others as place/brand", () => {
    expect(toSuggestion(base({ type: ENTITY_TYPES.place, tags: ["Restaurant"], tagIds: ["t"] }))?.category).toBe("food");
    expect(toSuggestion(base({ type: ENTITY_TYPES.place, tags: ["Museum"], tagIds: ["t"] }))?.category).toBe("place");
    expect(toSuggestion(base({ type: ENTITY_TYPES.brand, description: "A British restaurant chain." }))?.category).toBe("food");
    expect(toSuggestion(base({ type: ENTITY_TYPES.brand, tags: ["Sportswear"], tagIds: ["t"] }))?.category).toBe("brand");
  });
  it("drops unsupported types such as albums", () => {
    expect(toSuggestion(base({ type: "urn:entity:album" }))).toBeNull();
  });
});
