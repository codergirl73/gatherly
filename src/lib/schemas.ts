import { z } from "zod";

export const CATEGORIES = ["film", "tv", "music", "food", "place", "brand", "book"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  film: "Film",
  tv: "TV show",
  music: "Artist",
  food: "Restaurant / food",
  place: "Place",
  brand: "Brand",
  book: "Book",
};

export const favoriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  /** Set when the favorite was picked from Qloo's search suggestions: skips a second lookup. */
  entityId: z.string().regex(/^[0-9A-Fa-f-]{36}$/).optional(),
  image: z.string().url().max(300).optional(),
  tags: z.array(z.object({ id: z.string().max(120), name: z.string().max(60) })).max(12).optional(),
});

export const personSchema = z.object({
  name: z.string().trim().min(1).max(40),
  favorites: z.array(favoriteSchema).min(1).max(6),
});

export const EVENT_TYPES = ["team social", "birthday", "offsite", "friends night out"] as const;
export const BUDGETS = ["$", "$$", "$$$", "$$$$"] as const;

export const groupInputSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  city: z.string().trim().min(2).max(60),
  date: z.string().max(32).optional(),
  budget: z.enum(BUDGETS),
  /** Explicit, user-entered constraints only (dietary, accessibility, ...). Never inferred from taste. */
  constraints: z.string().max(300).optional(),
  people: z.array(personSchema).min(2).max(6),
});
export type GroupInput = z.infer<typeof groupInputSchema>;
export type Person = z.infer<typeof personSchema>;

const fits = z.array(z.string()).describe("Names of group members this pick fits");

const pick = z.object({
  /** Qloo entity id. Required in Qloo mode; absent in the LLM-only baseline. */
  entityId: z.string().optional(),
  name: z.string(),
  why: z.string().describe("One or two sentences tying the pick to specific members' favorites"),
  fits,
});

export const planSchema = z.object({
  title: z.string(),
  summary: z.string().describe("Two-sentence overview of the event"),
  theme: z.object({ name: z.string(), description: z.string(), why: z.string(), fits }),
  venue: pick.extend({
    cuisine: z.string(),
    address: z.string().optional(),
  }),
  playlist: z.object({
    direction: z.string().describe("The sound of the night in one sentence"),
    artists: z.array(pick).min(3).max(6),
  }),
  activity: pick.extend({ address: z.string().optional() }),
  film: pick.optional(),
  tradeoffs: z.array(
    z.object({
      note: z.string(),
      between: z.array(z.string()),
      balancedAlternative: z.string(),
    }),
  ),
  constraintsNote: z.string().optional(),
});
export type Plan = z.infer<typeof planSchema>;

/** Overlap output rendered by the taste-overlap visualization. */
export interface TasteTheme {
  id: string;
  label: string;
  people: string[];
}
export interface OverlapResult {
  shared: TasteTheme[];
  individual: Record<string, TasteTheme[]>;
  pairs: { a: string; b: string; score: number }[];
  /** Overall 0..100 group harmony score. */
  groupScore: number;
  source: "qloo-compare" | "entity-tags";
}

export interface ResolvedEntity {
  personName: string;
  inputName: string;
  category: Category;
  entityId: string;
  name: string;
  matchedName: string;
  uncertain: boolean;
  tags: string[];
  tagIds: string[];
}

export type AgentEvent =
  | { type: "step"; message: string }
  | { type: "overlap"; overlap: OverlapResult }
  | { type: "warning"; message: string }
  | { type: "plan"; plan: Plan; evidence: Record<string, string[]> }
  | { type: "error"; message: string; kind: "rate_limited" | "unavailable" | "no_matches" | "config" | "unknown" };
