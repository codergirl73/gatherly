import { planSchema, type Plan } from "../schemas";
import type { RunContext } from "./tools";

export interface GroundingResult {
  ok: boolean;
  errors: string[];
  plan?: Plan;
  evidence: Record<string, string[]>;
}

/**
 * Enforces that every pick is an entity Qloo actually returned in this run, that the part
 * matches, and that "fits" only names real group members. Names/addresses are overwritten
 * from Qloo data so the model cannot alter or invent them.
 */
export function groundPlan(raw: unknown, ctx: RunContext): GroundingResult {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), evidence: {} };
  }
  const plan = structuredClone(parsed.data);
  const errors: string[] = [];
  const evidence: Record<string, string[]> = {};
  const members = new Set(ctx.peopleNames);

  const cleanFits = (fits: string[], label: string) => {
    const valid = fits.filter((f) => members.has(f));
    if (!valid.length) errors.push(`${label}: "fits" must list real group members (${[...members].join(", ")})`);
    return valid;
  };

  const ground = <T extends { entityId?: string; name: string; fits: string[]; address?: string }>(
    p: T,
    part: "venue" | "playlist" | "film" | "activity",
    label: string,
  ) => {
    const c = p.entityId ? ctx.candidates.get(p.entityId) : undefined;
    if (!c) errors.push(`${label}: entityId "${p.entityId}" was not returned by get_insights. Pick only from returned candidates.`);
    else if (c.part !== part) errors.push(`${label}: entityId belongs to "${c.part}" results, not "${part}".`);
    else {
      p.name = c.entity.name;
      if (part === "venue" || part === "activity") p.address = c.entity.address;
      evidence[c.entity.id] = Object.entries(c.evidence).flatMap(([person, e]) => e.map((x) => `${person}: ${x}`));
      // A pick can only claim members Qloo actually linked it to (or all members for group-level matches).
      p.fits = p.fits.filter((f) => c.fits.includes(f) || c.fits.length === 0);
    }
    p.fits = cleanFits(p.fits.length ? p.fits : c?.fits ?? [], label);
  };

  ground(plan.venue, "venue", "venue");
  plan.playlist.artists.forEach((a, i) => ground(a, "playlist", `playlist.artists[${i}]`));
  ground(plan.activity, "activity", "activity");
  if (plan.film) ground(plan.film, "film", "film");
  plan.theme.fits = plan.theme.fits.filter((f) => members.has(f));
  for (const t of plan.tradeoffs) t.between = t.between.filter((f) => members.has(f));

  return { ok: errors.length === 0, errors, plan, evidence };
}
