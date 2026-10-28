import { describe, expect, it, vi } from "vitest";
import { QlooClient, extractEntities } from "../src/lib/qloo/client";
import { ENTITY_TYPES, QlooError } from "../src/lib/qloo/types";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const mk = (fetchImpl: typeof fetch, extra = {}) =>
  new QlooClient({ apiKey: "test-key", fetchImpl, sleep: async () => {}, ...extra });

describe("QlooClient", () => {
  it("sends the X-Api-Key header and the insights params", async () => {
    const f = vi.fn(async () => json({ results: { entities: [] } }));
    await mk(f as never).insights({ type: ENTITY_TYPES.place, signalEntityIds: ["a", "b"], location: "Lisbon" });
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe("/v2/insights");
    expect(url.searchParams.get("filter.type")).toBe("urn:entity:place");
    expect(url.searchParams.get("signal.interests.entities")).toBe("a,b");
    expect(url.searchParams.get("filter.location.query")).toBe("Lisbon");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("test-key");
  });

  it("caches identical requests and de-duplicates in-flight ones", async () => {
    const f = vi.fn(async () => json({ results: [] }));
    const c = mk(f as never);
    await Promise.all([c.search("Radiohead"), c.search("Radiohead")]);
    await c.search("Radiohead");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries 429/5xx with backoff then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429, { "retry-after": "1" }))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ results: [] }));
    const sleep = vi.fn(async () => {});
    await mk(f as never, { sleep }).search("x");
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("gives up with a rate_limited error after max retries", async () => {
    const f = vi.fn(async () => json({}, 429));
    await expect(mk(f as never, { maxRetries: 2 }).search("x")).rejects.toMatchObject({ kind: "rate_limited" });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not retry 400s and surfaces the message", async () => {
    const f = vi.fn(async () => json({ errors: [{ message: "unable to resolve" }] }, 400));
    await expect(mk(f as never).insights({ type: ENTITY_TYPES.place, location: "Zzz" })).rejects.toBeInstanceOf(QlooError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("spaces request starts to respect the rate cap", async () => {
    const sleeps: number[] = [];
    const f = vi.fn(async () => json({ results: [] }));
    const c = mk(f as never, { maxPerSecond: 4, sleep: async (ms: number) => void sleeps.push(ms) });
    await Promise.all([c.search("a"), c.search("b"), c.search("c")]);
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleeps.length).toBeGreaterThanOrEqual(2);
  });
});

describe("extractEntities", () => {
  it("parses insights and search shapes, dedupes, and prefers geocode.city", () => {
    const place = {
      entity_id: "p1",
      name: "Time Out Market",
      subtype: "urn:entity:place",
      query: { affinity: 0.9 },
      properties: { address: "Lisboa", geocode: { city: "Lisbon", name: "São Paulo", country_code: "PT" } },
      tags: [{ name: "Foodies", tag_id: "urn:tag:x" }],
    };
    const ins = extractEntities({ results: { entities: [place, place] } });
    expect(ins).toHaveLength(1);
    expect(ins[0]).toMatchObject({ id: "p1", city: "Lisbon", neighborhood: "São Paulo", affinity: 0.9, tagIds: ["urn:tag:x"] });
    const search = extractEntities({ results: [{ entity_id: "a1", name: "Radiohead", types: ["urn:entity:artist"] }] });
    expect(search[0].type).toBe("urn:entity:artist");
    expect(extractEntities({})).toEqual([]);
  });
});
