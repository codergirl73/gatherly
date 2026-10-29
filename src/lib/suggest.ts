import type { Category } from "./schemas";
import { ENTITY_TYPES, type QlooEntity } from "./qloo/types";

export interface Suggestion {
  id: string;
  name: string;
  category: Category;
  image?: string;
  subtitle: string;
  tags: { id: string; name: string }[];
}

export const SUGGEST_TYPES = [ENTITY_TYPES.artist, ENTITY_TYPES.movie, ENTITY_TYPES.tvShow, ENTITY_TYPES.place, ENTITY_TYPES.brand, ENTITY_TYPES.book].join(",");

const FOOD = /restaurant|cuisine|food|dining|cafe|coffee|pizza|bakery|bar\b|ramen|sushi|taco|burger|brunch/i;

/** Map a Qloo entity from /search to one of Gatherly's favorite categories (null = not useful for the group). */
export function toSuggestion(e: QlooEntity): Suggestion | null {
  const tags = e.tags.map((name, i) => ({ id: e.tagIds[i] ?? "", name })).filter((t) => t.id).slice(0, 8);
  const blob = `${e.tags.join(" ")} ${e.description ?? ""}`;
  let category: Category | null = null;
  switch (e.type) {
    case ENTITY_TYPES.artist: category = "music"; break;
    case ENTITY_TYPES.movie: category = "film"; break;
    case ENTITY_TYPES.tvShow: category = "tv"; break;
    case ENTITY_TYPES.book: category = "book"; break;
    case ENTITY_TYPES.brand: category = FOOD.test(blob) ? "food" : "brand"; break;
    case ENTITY_TYPES.place: category = FOOD.test(blob) ? "food" : "place"; break;
  }
  if (!category) return null;
  const subtitle = e.description ? e.description.split(/(?<=\.)\s/)[0].slice(0, 90) : e.tags.slice(0, 3).join(" · ");
  return { id: e.id, name: e.name, category, image: e.image, subtitle, tags };
}
