import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL ?? "http://localhost:6333";

const apiKey = process.env.QDRANT_API_KEY?.trim();

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,

  ...(apiKey
    ? {
        apiKey,
      }
    : {}),
});
