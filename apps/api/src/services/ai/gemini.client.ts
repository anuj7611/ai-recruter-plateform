import { ChatGoogle } from "@langchain/google/node";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY is not defined");
}

export const geminiModel = new ChatGoogle({
  model: process.env.GEMINI_RESUME_MODEL ?? "gemini-3.6-flash",

  apiKey,

  maxRetries: 2,
});
