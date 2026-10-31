import { describe, expect, it, vi } from "vitest";
import { generateWithRetry, isRetryable } from "../src/lib/agent/gemini";

const ok = { text: "ok" } as never;
const busy = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');

describe("generateWithRetry", () => {
  it("retries transient errors, then succeeds", async () => {
    const generate = vi.fn().mockRejectedValueOnce(busy).mockResolvedValueOnce(ok);
    const sleep = vi.fn(async () => {});
    await expect(generateWithRetry({ contents: "hi" }, { generate, sleep })).resolves.toBe(ok);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("switches to the fallback model after two failures", async () => {
    const generate = vi.fn().mockRejectedValueOnce(busy).mockRejectedValueOnce(busy).mockResolvedValueOnce(ok);
    await generateWithRetry({ contents: "hi" }, { generate, sleep: async () => {} });
    const models = generate.mock.calls.map((c) => c[0].model);
    expect(models[0]).toBe(models[1]);
    expect(models[2]).not.toBe(models[0]);
  });

  it("gives up after 4 attempts", async () => {
    const generate = vi.fn().mockRejectedValue(busy);
    await expect(generateWithRetry({ contents: "hi" }, { generate, sleep: async () => {} })).rejects.toBe(busy);
    expect(generate).toHaveBeenCalledTimes(4);
  });

  it("does not retry non-transient errors", async () => {
    const bad = new Error('{"error":{"code":400,"message":"API key not valid","status":"INVALID_ARGUMENT"}}');
    const generate = vi.fn().mockRejectedValue(bad);
    await expect(generateWithRetry({ contents: "hi" }, { generate, sleep: async () => {} })).rejects.toBe(bad);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("classifies errors", () => {
    expect(isRetryable(busy)).toBe(true);
    expect(isRetryable(new Error("Deadline expired: DEADLINE_EXCEEDED"))).toBe(true);
    expect(isRetryable(new Error("API key not valid"))).toBe(false);
  });
});

describe("thinking level", () => {
  it("defaults to low thinking and drops the setting if the model rejects it", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error('{"error":{"code":400,"message":"thinking_level is not supported for this model"}}'))
      .mockResolvedValueOnce(ok);
    await generateWithRetry({ contents: "hi" }, { generate, sleep: async () => {} });
    expect(generate.mock.calls[0][0].config.thinkingConfig.thinkingLevel).toBe("LOW");
    expect(generate.mock.calls[1][0].config.thinkingConfig).toBeUndefined();
  });
});

import { isExhausted, noteQuotaError, resetQuotaState } from "../src/lib/agent/gemini";

describe("daily quota handling", () => {
  const quota = new Error('{"error":{"code":429,"message":"Quota exceeded ... Generate content requests per day limit exceeded on Free Tier. Please retry in 5h32m39.9s.","status":"RESOURCE_EXHAUSTED"}}');

  it("recognizes a spent daily quota and skips that model afterwards", async () => {
    resetQuotaState();
    expect(noteQuotaError("m1", quota)).toBe(true);
    expect(isExhausted("m1")).toBe(true);
    expect(isExhausted("other")).toBe(false);
    resetQuotaState();
  });

  it("ignores ordinary rate-limit errors", () => {
    resetQuotaState();
    expect(noteQuotaError("m1", new Error("429 RESOURCE_EXHAUSTED: too many requests per minute"))).toBe(false);
    expect(isExhausted("m1")).toBe(false);
  });

  it("goes straight to the fallback model when the primary's daily quota is spent", async () => {
    resetQuotaState();
    const generate = vi.fn().mockRejectedValueOnce(quota).mockResolvedValueOnce(ok);
    const sleep = vi.fn(async () => {});
    await generateWithRetry({ contents: "hi" }, { generate, sleep });
    expect(sleep).not.toHaveBeenCalled();
    const models = generate.mock.calls.map((c) => c[0].model);
    expect(models[1]).not.toBe(models[0]);
    resetQuotaState();
  });
});
