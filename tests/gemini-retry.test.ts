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
