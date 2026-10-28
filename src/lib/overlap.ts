import type { OverlapResult, ResolvedEntity, TasteTheme } from "./schemas";

/** Tags too generic to say anything about taste. */
const NOISE =
  /^urn:tag:(collection|popularity|source|external|language|region|country|genre:place|category:place|cost_description|dining|offerings|amenit|good_for)/;

export function prettyTag(id: string, names: Map<string, string>): string {
  return names.get(id) ?? id.split(":").pop()!.replace(/_/g, " ");
}

/**
 * Overlap from per-person tag sets (id -> people who carry it). Shared = carried by
 * >= 2 people; individual = carried by exactly one. Pairwise score is Jaccard similarity.
 */
export function computeOverlap(
  tagsByPerson: Record<string, { id: string; name: string }[]>,
  source: OverlapResult["source"] = "entity-tags",
): OverlapResult {
  const people = Object.keys(tagsByPerson);
  const names = new Map<string, string>();
  const sets: Record<string, Set<string>> = {};
  for (const p of people) {
    sets[p] = new Set();
    for (const t of tagsByPerson[p]) {
      if (NOISE.test(t.id)) continue;
      sets[p].add(t.id);
      names.set(t.id, t.name);
    }
  }
  const holders = new Map<string, string[]>();
  for (const p of people) for (const id of sets[p]) holders.set(id, [...(holders.get(id) ?? []), p]);

  const toTheme = ([id, who]: [string, string[]]): TasteTheme => ({ id, label: prettyTag(id, names), people: who });
  const shared = [...holders]
    .filter(([, w]) => w.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 24)
    .map(toTheme);

  const individual: Record<string, TasteTheme[]> = {};
  for (const p of people) {
    individual[p] = [...holders]
      .filter(([, w]) => w.length === 1 && w[0] === p)
      .slice(0, 8)
      .map(toTheme);
  }

  const pairs: OverlapResult["pairs"] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = sets[people[i]];
      const b = sets[people[j]];
      const inter = [...a].filter((x) => b.has(x)).length;
      const union = new Set([...a, ...b]).size;
      pairs.push({ a: people[i], b: people[j], score: union ? Math.round((inter / union) * 100) : 0 });
    }
  }
  // Group overlap: on average, how much of each person's taste profile at least one other person shares.
  const coverage = people
    .filter((p) => sets[p].size)
    .map((p) => [...sets[p]].filter((id) => (holders.get(id)?.length ?? 0) >= 2).length / sets[p].size);
  const groupScore = coverage.length ? Math.round((coverage.reduce((a, b) => a + b, 0) / coverage.length) * 100) : 0;
  return { shared, individual, pairs, groupScore, source };
}

/** Collect per-person tags from resolved entities (fallback when Qloo compare is unavailable). */
export function tagsFromEntities(entities: ResolvedEntity[]) {
  const out: Record<string, { id: string; name: string }[]> = {};
  for (const e of entities) {
    out[e.personName] ??= [];
    e.tagIds.forEach((id, i) => out[e.personName].push({ id, name: e.tags[i] ?? id }));
  }
  return out;
}
