import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_API_KEY is not defined");
}

export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";

export const GEMINI_EMBEDDING_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_DIMENSION ?? 3072,
);

if (
  !Number.isInteger(GEMINI_EMBEDDING_DIMENSION) ||
  GEMINI_EMBEDDING_DIMENSION <= 0
) {
  throw new Error("GEMINI_EMBEDDING_DIMENSION must be a positive integer");
}

export const geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey,

  model: GEMINI_EMBEDDING_MODEL,

  maxRetries: 3,
});
