import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

/**
 * Gemini client. Uses a Gemini API key (Google AI Studio) when GEMINI_API_KEY is set;
 * otherwise Vertex AI (local dev uses gcloud ADC; hosted deploys use a base64 service-account JSON).
 */
export function getGemini(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return (client = new GoogleGenAI({ apiKey }));
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is not configured");
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  const credentials = b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf8")) : undefined;
  client = new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
    ...(credentials ? { googleAuthOptions: { credentials } } : {}),
  });
  return client;
}

export const geminiModel = () => process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

const RETRYABLE = /\b(429|500|502|503|504)\b|UNAVAILABLE|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|high demand|overloaded|fetch failed|ECONNRESET/i;
export const isRetryable = (e: unknown) => RETRYABLE.test(e instanceof Error ? `${e.name} ${e.message}` : String(e));

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
type GenerateResult = Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;

interface Deps {
  generate?: (p: GenerateParams) => Promise<GenerateResult>;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * generateContent with resilience for busy periods: up to 4 attempts with backoff, switching to
 * GEMINI_FALLBACK_MODEL (default gemini-3.1-flash-lite) after the second failure. Non-transient
 * errors (bad request, auth) are thrown immediately.
 */
export async function generateWithRetry(params: Omit<GenerateParams, "model">, deps: Deps = {}): Promise<GenerateResult> {
  const generate = deps.generate ?? ((p: GenerateParams) => getGemini().models.generateContent(p));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const primary = geminiModel();
  const fallback = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.1-flash-lite";
  const waits = [1000, 2500, 5000];
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const model = attempt >= 2 && fallback ? fallback : primary;
    try {
      return await generate({ ...params, model, config: { ...params.config, httpOptions: { timeout: 60_000, ...params.config?.httpOptions } } });
    } catch (e) {
      last = e;
      if (!isRetryable(e) || attempt === 3) throw e;
      console.warn(`gemini ${model} attempt ${attempt + 1} failed, retrying:`, e instanceof Error ? e.message.slice(0, 160) : e);
      await sleep(waits[attempt]);
    }
  }
  throw last;
}
