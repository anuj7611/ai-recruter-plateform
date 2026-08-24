import "dotenv/config";

import { geminiEmbeddings } from "../services/ai/gemini-embeddings.client.js";

const run = async () => {
  const vector = await geminiEmbeddings.embedQuery(
    "React Node.js full stack developer",
  );

  console.log("Embedding dimension:", vector.length);

  console.log("First 10 values:", vector.slice(0, 10));
};

run().catch((error) => {
  console.error("Embedding test failed:", error);

  process.exit(1);
});
