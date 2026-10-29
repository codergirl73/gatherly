import type { QlooClient } from "../qloo/client";
import { ENTITY_TYPES, PLACE_TAGS, type EntityType, type QlooEntity } from "../qloo/types";
import { computeOverlap, tagsFromEntities } from "../overlap";
import type { AgentEvent, Category, GroupInput, OverlapResult, ResolvedEntity } from "../schemas";

const CATEGORY_TYPE: Record<Category, EntityType> = {
  film: ENTITY_TYPES.movie,
  tv: ENTITY_TYPES.tvShow,
  music: ENTITY_TYPES.artist,
  food: ENTITY_TYPES.place,
  place: ENTITY_TYPES.place,
  brand: ENTITY_TYPES.brand,
  book: ENTITY_TYPES.book,
};

export type Part = "venue" | "playlist" | "film" | "activity";

export interface Candidate {
  entity: QlooEntity;
  part: Part;
  fits: string[];
  /** Real, API-derived reasons: person -> favorites whose Qloo tags overlap this candidate's tags. */
  evidence: Record<string, string[]>;
  cityMatch: boolean;
}

/** Per-run state. `candidates` is the grounding registry: only these ids may appear in the plan. */
export class RunContext {
  resolved: ResolvedEntity[] = [];
  cuisineHints: Record<string, string[]> = {};
  candidates = new Map<string, Candidate>();
  overlap?: OverlapResult;
  constructor(
    readonly input: GroupInput,
    readonly qloo: QlooClient,
    readonly emit: (e: AgentEvent) => void,
  ) {}
  get peopleNames() {
    return this.input.people.map((p) => p.name);
  }
  idsFor(person?: string) {
    return [...new Set(this.resolved.filter((r) => !person || r.personName === person).map((r) => r.entityId))];
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const looseMatch = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

export async function resolveEntities(ctx: RunContext) {
  const unresolved: { person: string; name: string; category: Category }[] = [];
  const uncertain: { person: string; asked: string; matched: string }[] = [];
  await Promise.all(
    ctx.input.people.map(async (person) => {
      ctx.emit({ type: "step", message: `Matching ${person.name}'s favorites…` });
      await Promise.all(
        person.favorites.map(async (fav) => {
          if (fav.entityId) {
            // Picked from Qloo's own suggestions in the builder: already resolved, no lookup needed.
            ctx.resolved.push({
              personName: person.name,
              inputName: fav.name,
              category: fav.category,
              entityId: fav.entityId,
              name: fav.name,
              matchedName: fav.name,
              uncertain: false,
              tags: (fav.tags ?? []).map((t) => t.name),
              tagIds: (fav.tags ?? []).map((t) => t.id),
            });
            return;
          }
          try {
            const results = await ctx.qloo.search(fav.name, { types: CATEGORY_TYPE[fav.category], take: 3 });
            const top = results.find((r) => looseMatch(r.name, fav.name)) ?? results[0];
            if (!top) throw new Error("none");
            const isUncertain = !looseMatch(top.name, fav.name);
            ctx.resolved.push({
              personName: person.name,
              inputName: fav.name,
              category: fav.category,
              entityId: top.id,
              name: top.name,
              matchedName: top.name,
              uncertain: isUncertain,
              tags: top.tags,
              tagIds: top.tagIds,
            });
            if (isUncertain) uncertain.push({ person: person.name, asked: fav.name, matched: top.name });
          } catch {
            // Food favorites are often cuisines ("ramen"), not venues: fall back to a Qloo cuisine tag.
            if (fav.category === "food") {
              const tags = await ctx.qloo.searchTags(fav.name, ENTITY_TYPES.place, 5).catch(() => []);
              const cuisine = tags.find((t) => t.id.startsWith("urn:tag:genre:place:restaurant:"));
              if (cuisine) {
                (ctx.cuisineHints[person.name] ??= []).push(cuisine.name);
                return;
              }
            }
            unresolved.push({ person: person.name, name: fav.name, category: fav.category });
          }
        }),
      );
    }),
  );
  for (const u of unresolved) ctx.emit({ type: "warning", message: `Couldn't find "${u.name}" (${u.person}) in Qloo. It was skipped.` });
  for (const u of uncertain) ctx.emit({ type: "warning", message: `"${u.asked}" (${u.person}) was matched to "${u.matched}". Double-check.` });
  const counts = ctx.input.people.map((p) => ({ person: p.name, matched: ctx.idsFor(p.name).length }));
  return {
    resolved_per_person: counts,
    cuisine_hints: ctx.cuisineHints,
    unresolved,
    uncertain_matches: uncertain,
  };
}

export async function compareTastes(ctx: RunContext) {
  ctx.emit({ type: "step", message: "Comparing the group's tastes with Qloo…" });
  const names = ctx.peopleNames.filter((n) => ctx.idsFor(n).length > 0);
  let overlap: OverlapResult;
  try {
    // Each person vs. the rest of the group via Qloo's analysis/compare endpoint.
    const tagsByPerson: Record<string, { id: string; name: string }[]> = {};
    await Promise.all(
      names.map(async (n) => {
        const rest = ctx.idsFor().filter((id) => !ctx.idsFor(n).includes(id));
        const { a } = await ctx.qloo.compare(ctx.idsFor(n), rest.length ? rest : ctx.idsFor(n));
        tagsByPerson[n] = a;
      }),
    );
    overlap = computeOverlap(tagsByPerson, "qloo-compare");
    if (!overlap.shared.length) throw new Error("empty");
  } catch {
    overlap = computeOverlap(tagsFromEntities(ctx.resolved), "entity-tags");
  }
  ctx.overlap = overlap;
  ctx.emit({ type: "overlap", overlap });
  return {
    group_harmony_score: overlap.groupScore,
    shared_themes: overlap.shared.slice(0, 10).map((t) => ({ theme: t.label, people: t.people })),
    unique_themes: Object.fromEntries(Object.entries(overlap.individual).map(([p, t]) => [p, t.slice(0, 4).map((x) => x.label)])),
    closest_pair: [...overlap.pairs].sort((a, b) => b.score - a.score)[0],
    furthest_pair: [...overlap.pairs].sort((a, b) => a.score - b.score)[0],
  };
}

const PART_TYPE: Record<Part, EntityType> = {
  venue: ENTITY_TYPES.place,
  activity: ENTITY_TYPES.place,
  playlist: ENTITY_TYPES.artist,
  film: ENTITY_TYPES.movie,
};
const PART_LABEL: Record<Part, string> = { venue: "restaurants", activity: "activities", playlist: "artists", film: "films" };
const BUDGET_LEVEL = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 } as const;

export async function getInsights(ctx: RunContext, part: Part, cuisine?: string) {
  const { city } = ctx.input;
  const located = part === "venue" || part === "activity";
  ctx.emit({
    type: "step",
    message: located ? `Finding ${PART_LABEL[part]} in ${city}…` : `Finding ${PART_LABEL[part]} the group will enjoy…`,
  });

  const extra: Record<string, string | number> = {};
  let cuisineUsed: string | undefined;
  if (part === "venue") {
    const hint = cuisine ?? Object.values(ctx.cuisineHints).flat()[0];
    let tagId: string = PLACE_TAGS.restaurant;
    if (hint) {
      const tags = await ctx.qloo.searchTags(hint, ENTITY_TYPES.place, 6).catch(() => []);
      const t = tags.find((x) => x.id.startsWith("urn:tag:genre:place:restaurant:"));
      if (t) {
        tagId = t.id;
        cuisineUsed = t.name;
      }
    }
    extra["filter.tags"] = tagId;
    extra["filter.price_level.max"] = BUDGET_LEVEL[ctx.input.budget];
  } else if (part === "activity") {
    extra["filter.exclude.tags"] = PLACE_TAGS.restaurant;
  }

  const query = (ids: string[]) =>
    ctx.qloo
      .insights({ type: PART_TYPE[part], signalEntityIds: ids, location: located ? city : undefined, take: 20, extra })
      .catch((e) => {
        if (located && extra["filter.price_level.max"]) {
          // Price filter may be unsupported for some localities: retry without it rather than fail the run.
          const { ["filter.price_level.max"]: _drop, ...rest } = extra;
          void _drop;
          return ctx.qloo.insights({ type: PART_TYPE[part], signalEntityIds: ids, location: city, take: 20, extra: rest });
        }
        throw e;
      });

  const people = ctx.peopleNames.filter((n) => ctx.idsFor(n).length > 0);
  const [group, ...perPerson] = await Promise.all([query(ctx.idsFor()), ...people.map((n) => query(ctx.idsFor(n)))]);

  const byId = new Map<string, Candidate>();
  const add = (e: QlooEntity, person?: string) => {
    let c = byId.get(e.id);
    if (!c) {
      const cityMatch = !located || !e.city || looseMatch(e.city, city) || looseMatch(e.neighborhood ?? "", city);
      c = { entity: e, part, fits: [], evidence: {}, cityMatch };
      byId.set(e.id, c);
    }
    if (person && !c.fits.includes(person)) c.fits.push(person);
    if ((e.affinity ?? 0) > (c.entity.affinity ?? 0)) c.entity = e;
  };
  group.forEach((e) => add(e));
  perPerson.forEach((list, i) => list.forEach((e) => add(e, people[i])));

  // Evidence: which of each fitting person's favorites share Qloo tags with this candidate.
  for (const c of byId.values()) {
    const candTags = new Set(c.entity.tagIds);
    for (const person of c.fits) {
      const hits = ctx.resolved
        .filter((r) => r.personName === person)
        .map((r) => ({ fav: r.matchedName, shared: r.tagIds.map((id, i) => [id, r.tags[i]] as const).filter(([id]) => candTags.has(id)).map(([, n]) => n) }))
        .filter((h) => h.shared.length)
        .sort((a, b) => b.shared.length - a.shared.length)
        .slice(0, 2);
      c.evidence[person] = hits.length
        ? hits.map((h) => `${h.fav} → ${h.shared.slice(0, 3).join(", ")}`)
        : [`Qloo ranks it high for ${person}'s overall taste profile`];
    }
  }

  const ranked = [...byId.values()]
    .filter((c) => c.entity.id)
    .sort((a, b) => Number(b.cityMatch) - Number(a.cityMatch) || b.fits.length - a.fits.length || (b.entity.affinity ?? 0) - (a.entity.affinity ?? 0))
    .slice(0, 8);
  ranked.forEach((c) => ctx.candidates.set(c.entity.id, c));

  return {
    part,
    city: located ? city : undefined,
    cuisine: cuisineUsed,
    group_size: people.length,
    candidates: ranked.map((c) => ({
      entity_id: c.entity.id,
      name: c.entity.name,
      fits_members: c.fits,
      fits_count: c.fits.length,
      affinity: c.entity.affinity !== undefined ? Number(c.entity.affinity.toFixed(2)) : undefined,
      address: c.entity.address,
      city: c.entity.city,
      price_level: c.entity.priceLevel,
      tags: c.entity.tags.slice(0, 6),
      why_evidence: c.evidence,
    })),
  };
}
