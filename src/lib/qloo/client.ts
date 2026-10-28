/* eslint-disable @typescript-eslint/no-explicit-any -- Qloo responses are loosely typed JSON; parsers validate shape at runtime. */
import { QLOO_BASE_URL, QlooError, type EntityType, type QlooEntity, type QlooTag } from "./types";

type Params = Record<string, string | number | undefined>;

export interface QlooClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Max request starts per second (queue spacing). */
  maxPerSecond?: number;
  maxRetries?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Small Qloo client: serialized request queue (<= maxPerSecond), retries with
 * exponential backoff on 429/5xx, per-request timeout, and an in-memory cache
 * that also de-duplicates in-flight identical requests.
 */
export class QlooClient {
  private readonly opts: Required<Omit<QlooClientOptions, "apiKey">> & { apiKey: string };
  private cache = new Map<string, { at: number; value: unknown }>();
  private inflight = new Map<string, Promise<unknown>>();
  private tail: Promise<void> = Promise.resolve();
  private nextSlot = 0;
  requestCount = 0;

  constructor(o: QlooClientOptions) {
    this.opts = {
      baseUrl: QLOO_BASE_URL,
      maxPerSecond: 4,
      maxRetries: 3,
      timeoutMs: 12_000,
      cacheTtlMs: 60 * 60 * 1000,
      fetchImpl: (...a) => fetch(...a),
      sleep: defaultSleep,
      ...o,
    };
  }

  /** Waits for the next free slot so request starts are spaced >= 1/maxPerSecond. */
  private schedule(): Promise<void> {
    const gap = 1000 / this.opts.maxPerSecond;
    const run = this.tail.then(async () => {
      const wait = this.nextSlot - Date.now();
      if (wait > 0) await this.opts.sleep(wait);
      this.nextSlot = Date.now() + gap;
    });
    this.tail = run.catch(() => {});
    return run;
  }

  private cacheKey(path: string, params: Params) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${path}?${q}`;
  }

  async get<T = unknown>(path: string, params: Params): Promise<T> {
    const key = this.cacheKey(path, params);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.opts.cacheTtlMs) return hit.value as T;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const p = this.request<T>(path, params)
      .then((value) => {
        this.cache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  private async request<T>(path: string, params: Params): Promise<T> {
    const url = new URL(path, this.opts.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    let lastErr: QlooError | undefined;
    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      await this.schedule();
      this.requestCount++;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs);
      try {
        const res = await this.opts.fetchImpl(url, {
          headers: { "X-Api-Key": this.opts.apiKey, Accept: "application/json" },
          signal: ctrl.signal,
        });
        if (res.ok) return (await res.json()) as T;
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          throw new QlooError(`Qloo rejected the request (${res.status}). ${body.slice(0, 200)}`, "unauthorized", res.status);
        }
        if (res.status === 429 || res.status >= 500) {
          lastErr = new QlooError(
            `Qloo ${res.status === 429 ? "rate limit" : "server error"} (${res.status})`,
            res.status === 429 ? "rate_limited" : "unavailable",
            res.status,
          );
          const retryAfter = Number(res.headers.get("retry-after"));
          await this.backoff(attempt, retryAfter);
          continue;
        }
        throw new QlooError(`Qloo request failed (${res.status}). ${body.slice(0, 200)}`, "bad_request", res.status);
      } catch (e) {
        if (e instanceof QlooError && e.kind !== "unavailable" && e.kind !== "rate_limited") throw e;
        if (e instanceof QlooError) continue;
        const aborted = e instanceof Error && e.name === "AbortError";
        lastErr = new QlooError(aborted ? "Qloo request timed out" : "Could not reach Qloo", aborted ? "timeout" : "unavailable");
        await this.backoff(attempt);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr ?? new QlooError("Qloo request failed", "unknown");
  }

  private backoff(attempt: number, retryAfterSec?: number) {
    if (attempt >= this.opts.maxRetries) return Promise.resolve();
    const ms = retryAfterSec && retryAfterSec > 0 ? retryAfterSec * 1000 : 500 * 2 ** attempt;
    return this.opts.sleep(ms);
  }

  /** /search: resolve a free-text name to Qloo entities. */
  async search(query: string, opts: { types?: string; take?: number } = {}): Promise<QlooEntity[]> {
    const raw = await this.get("/search", { query, types: opts.types, take: opts.take ?? 5 });
    return extractEntities(raw);
  }

  /** /v2/tags: find tag ids (e.g. a cuisine) by keyword. */
  async searchTags(query: string, parentType?: EntityType, take = 6): Promise<QlooTag[]> {
    const raw = await this.get<{ results?: { tags?: { id?: string; name?: string }[] } }>("/v2/tags", {
      "filter.query": query,
      "filter.parents.types": parentType,
      take,
    });
    return (raw.results?.tags ?? []).flatMap((t) => (t.id && t.name ? [{ id: t.id, name: t.name }] : []));
  }

  /**
   * /v2/analysis/compare: taste tags of group A vs group B (tags carry a `query.count`
   * of how many seed entities in that group carry them).
   */
  async compare(a: string[], b: string[]): Promise<{ a: QlooTag[]; b: QlooTag[] }> {
    const raw = await this.get<{ results?: { a?: any[]; b?: any[] } }>("/v2/analysis/compare", {
      "a.signal.interests.entities": a.join(","),
      "b.signal.interests.entities": b.join(","),
    });
    const toTags = (l?: any[]) => (l ?? []).flatMap((t) => (t.tag_id && t.name ? [{ id: t.tag_id as string, name: t.name as string }] : []));
    return { a: toTags(raw.results?.a), b: toTags(raw.results?.b) };
  }

  /** /v2/insights: recommendations for a type, seeded by entity ids and/or a locality. */
  async insights(o: {
    type: EntityType;
    signalEntityIds?: string[];
    /** Locality name, e.g. "Lisbon" (Place/Destination only). */
    location?: string;
    take?: number;
    extra?: Params;
  }): Promise<QlooEntity[]> {
    const raw = await this.get("/v2/insights", {
      "filter.type": o.type,
      "signal.interests.entities": o.signalEntityIds?.join(","),
      "filter.location.query": o.location,
      take: o.take ?? 10,
      ...o.extra,
    });
    return extractEntities(raw);
  }
}

/** Tolerant parser: Qloo wraps entity lists as `results.entities` (insights) or `results` (search). */
export function extractEntities(raw: unknown): QlooEntity[] {
  const r = raw as Record<string, unknown> | null;
  const results = r?.results as unknown;
  const list: unknown[] = Array.isArray(results)
    ? results
    : Array.isArray((results as { entities?: unknown[] } | undefined)?.entities)
      ? (results as { entities: unknown[] }).entities
      : Array.isArray(r?.entities)
        ? (r!.entities as unknown[])
        : [];
  const seen = new Set<string>();
  return list.flatMap((item) => {
    const e = item as Record<string, any>;
    const id = e.entity_id ?? e.id;
    const name = e.name;
    if (typeof id !== "string" || typeof name !== "string" || seen.has(id)) return [];
    seen.add(id);
    const props = (e.properties ?? {}) as Record<string, any>;
    const geo = (props.geocode ?? {}) as Record<string, any>;
    return [
      {
        id,
        name,
        type: e.subtype ?? (Array.isArray(e.types) ? e.types[0] : e.type),
        affinity: typeof e.query?.affinity === "number" ? e.query.affinity : undefined,
        popularity: typeof e.popularity === "number" ? e.popularity : undefined,
        address: props.address ?? e.address,
        city: geo.city ?? geo.metro ?? geo.name,
        neighborhood: geo.name,
        region: geo.admin1_region,
        country: geo.country_code,
        description: props.short_description ?? props.description,
        priceLevel: typeof props.price_level === "number" ? props.price_level : undefined,
        tags: Array.isArray(e.tags) ? e.tags.map((t: any) => t?.name).filter(Boolean) : [],
        tagIds: Array.isArray(e.tags) ? e.tags.map((t: any) => t?.tag_id ?? t?.value).filter(Boolean) : [],
      } satisfies QlooEntity,
    ];
  });
}

let shared: QlooClient | undefined;
/** Process-wide client so the cache and queue are shared across requests. */
export function getQlooClient(): QlooClient {
  const apiKey = process.env.QLOO_API_KEY;
  if (!apiKey) throw new QlooError("QLOO_API_KEY is not configured", "unauthorized");
  return (shared ??= new QlooClient({ apiKey }));
}
