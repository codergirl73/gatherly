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
