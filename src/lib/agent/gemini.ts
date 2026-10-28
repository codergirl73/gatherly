import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

/** Gemini on Vertex AI. Local dev uses gcloud ADC; Vercel uses a base64 service-account JSON. */
export function getGemini(): GoogleGenAI {
  if (client) return client;
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

export const geminiModel = () => process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
