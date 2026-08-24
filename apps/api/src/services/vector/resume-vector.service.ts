import {
  GEMINI_EMBEDDING_DIMENSION,
  GEMINI_EMBEDDING_MODEL,
} from "../ai/gemini-embeddings.client.js";

import { qdrantClient } from "./qdrant.client.js";

const getCollectionName = () =>
  process.env.QDRANT_RESUME_COLLECTION ?? "resume_chunks";

interface ResumeVectorPoint {
  id: string;

  vector: number[];

  resumeId: string;

  candidateProfileId: string;

  chunkIndex: number;

  section: string;

  text: string;

  contentHash: string | null;

  metadata: unknown;
}

export interface ResumeSearchResult {
  chunkId: string;

  resumeId: string;

  section: string;

  chunkIndex: number;

  text: string;

  score: number;
}

// =====================================
// Ensure collection exists
// =====================================

export const ensureResumeCollection = async () => {
  const collectionName = getCollectionName();

  const collections = await qdrantClient.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === collectionName,
  );

  if (exists) {
    return;
  }

  await qdrantClient.createCollection(collectionName, {
    vectors: {
      size: GEMINI_EMBEDDING_DIMENSION,

      distance: "Cosine",
    },
  });

  /*
   * These fields will later be
   * heavily used for filtering.
   */

  await qdrantClient.createPayloadIndex(collectionName, {
    field_name: "resumeId",

    field_schema: "keyword",

    wait: true,
  });

  await qdrantClient.createPayloadIndex(collectionName, {
    field_name: "candidateProfileId",

    field_schema: "keyword",

    wait: true,
  });

  await qdrantClient.createPayloadIndex(collectionName, {
    field_name: "section",

    field_schema: "keyword",

    wait: true,
  });
};

// =====================================
// Delete old resume vectors
// =====================================

export const deleteResumeVectors = async (resumeId: string) => {
  await qdrantClient.delete(getCollectionName(), {
    wait: true,

    filter: {
      must: [
        {
          key: "resumeId",

          match: {
            value: resumeId,
          },
        },
      ],
    },
  });
};

// =====================================
// Upsert resume vectors
// =====================================

export const upsertResumeVectors = async (points: ResumeVectorPoint[]) => {
  if (!points.length) {
    return;
  }

  await qdrantClient.upsert(getCollectionName(), {
    wait: true,

    points: points.map((point) => ({
      id: point.id,

      vector: point.vector,

      payload: {
        chunkId: point.id,

        resumeId: point.resumeId,

        candidateProfileId: point.candidateProfileId,

        chunkIndex: point.chunkIndex,

        section: point.section,

        text: point.text,

        contentHash: point.contentHash,

        embeddingModel: GEMINI_EMBEDDING_MODEL,

        metadata: point.metadata,
      },
    })),
  });
};

export const searchResumeVectors = async (
  resumeId: string,
  vector: number[],
  limit = 5,
): Promise<ResumeSearchResult[]> => {
  const collectionName = getCollectionName();

  const result = await qdrantClient.query(collectionName, {
    query: vector,

    filter: {
      must: [
        {
          key: "resumeId",

          match: {
            value: resumeId,
          },
        },
      ],
    },

    limit,

    with_payload: true,

    with_vector: false,
  });

  return result.points
    .map((point) => {
      const payload = point.payload ?? {};

      const text = typeof payload.text === "string" ? payload.text : "";

      const section =
        typeof payload.section === "string" ? payload.section : "OTHER";

      const chunkIndex =
        typeof payload.chunkIndex === "number" ? payload.chunkIndex : 0;

      const payloadResumeId =
        typeof payload.resumeId === "string" ? payload.resumeId : resumeId;

      return {
        chunkId: String(point.id),

        resumeId: payloadResumeId,

        section,

        chunkIndex,

        text,

        score: point.score,
      };
    })
    .filter((result) => result.text.length > 0);
};
