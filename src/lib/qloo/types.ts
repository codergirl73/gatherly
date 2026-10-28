export const QLOO_BASE_URL = "https://hackathon.api.qloo.com";

/** Insights `filter.type` URNs confirmed in the Qloo hackathon developer guide. */
export const ENTITY_TYPES = {
  artist: "urn:entity:artist",
  book: "urn:entity:book",
  brand: "urn:entity:brand",
  destination: "urn:entity:destination",
  movie: "urn:entity:movie",
  person: "urn:entity:person",
  place: "urn:entity:place",
  podcast: "urn:entity:podcast",
  tvShow: "urn:entity:tv_show",
  videoGame: "urn:entity:videogame",
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

/** A trimmed Qloo entity (the API returns many verbose fields we do not need). */
export interface QlooEntity {
  id: string;
  name: string;
  type?: string;
  /** 0..1 affinity to the signal, when returned by /v2/insights. */
  affinity?: number;
  popularity?: number;
  address?: string;
  city?: string;
  neighborhood?: string;
  region?: string;
  country?: string;
  description?: string;
  priceLevel?: number;
  tags: string[];
  /** Qloo tag ids (e.g. urn:tag:genre:music:indie), used for taste-overlap math. */
  tagIds: string[];
}

export interface QlooTag {
  id: string;
  name: string;
}

/** Tag filters verified live: `filter.tags` on urn:entity:place changes results. */
export const PLACE_TAGS = {
  restaurant: "urn:tag:category:place:restaurant",
  cuisine: (c: string) => `urn:tag:genre:place:restaurant:${c}`,
} as const;

export class QlooError extends Error {
  constructor(
    message: string,
    readonly kind: "rate_limited" | "unauthorized" | "bad_request" | "unavailable" | "timeout" | "unknown",
    readonly status?: number,
  ) {
    super(message);
    this.name = "QlooError";
  }
}
