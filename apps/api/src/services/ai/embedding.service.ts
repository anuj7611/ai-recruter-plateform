import {
  GEMINI_EMBEDDING_DIMENSION,
  geminiEmbeddings,
} from "./gemini-embeddings.client.js";

const EMBEDDING_BATCH_SIZE = 50;

const validateVector = (vector: number[]) => {
  if (vector.length !== GEMINI_EMBEDDING_DIMENSION) {
    throw new Error(
      `Unexpected embedding dimension. Expected ${GEMINI_EMBEDDING_DIMENSION}, received ${vector.length}`,
    );
  }

  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding contains invalid numeric values");
  }
};

export const embedDocuments = async (texts: string[]): Promise<number[][]> => {
  if (!texts.length) {
    return [];
  }

  const allVectors: number[][] = [];

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE);

    const vectors = await geminiEmbeddings.embedDocuments(batch);

    if (vectors.length !== batch.length) {
      throw new Error("Embedding count does not match document count");
    }

    for (const vector of vectors) {
      validateVector(vector);

      allVectors.push(vector);
    }
  }

  return allVectors;
};

export const embedQuery = async (query: string): Promise<number[]> => {
  const trimmed = query.trim();

  if (!trimmed) {
    throw new Error("Embedding query cannot be empty");
  }

  const vector = await geminiEmbeddings.embedQuery(trimmed);

  validateVector(vector);

  return vector;
};
