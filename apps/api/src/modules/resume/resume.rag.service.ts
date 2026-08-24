import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { geminiModel } from "../../services/ai/gemini.client.js";
import { retrieveResumeContext } from "./resume.retrieval.service.js";

interface AskResumeInput {
  resumeId: string;

  question: string;

  limit?: number;
}

export const askResume = async ({
  resumeId,
  question,
  limit = 5,
}: AskResumeInput) => {
  // =================================
  // Retrieve relevant chunks
  // =================================

  const sources = await retrieveResumeContext(resumeId, question, limit);

  if (!sources.length) {
    return {
      answer:
        "I could not find enough information in the resume to answer that question.",

      sources: [],
    };
  }

  // =================================
  // Build RAG context
  // =================================

  const context = sources
    .map((source, index) =>
      `
SOURCE ${index + 1}
Section: ${source.section}
Chunk: ${source.chunkIndex}

${source.text}
        `.trim(),
    )
    .join("\n\n----------------\n\n");

  // =================================
  // Ask Gemini
  // =================================

  const response = await geminiModel.invoke([
    new SystemMessage(
      `
You are an AI assistant analyzing a candidate's resume.

You must answer using ONLY the resume context provided.

Rules:

1. Do not invent information.
2. Do not use outside knowledge to claim facts about the candidate.
3. If the context does not contain enough information, clearly say so.
4. Be concise and factual.
5. When discussing a project, skill, education, or experience, only mention details supported by the retrieved context.
6. Do not claim the candidate has a skill merely because the question mentions it.
7. Do not expose internal vector scores, chunk IDs, embeddings, or retrieval implementation.
      `.trim(),
    ),

    new HumanMessage(
      `
QUESTION:

${question}

================ RESUME CONTEXT ================

${context}

============== END RESUME CONTEXT ==============

Answer the question using only the resume context above.
      `.trim(),
    ),
  ]);

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty RAG response");
  }

  return {
    answer,

    sources: sources.map((source) => ({
      section: source.section,

      chunkIndex: source.chunkIndex,

      score: source.score,
    })),
  };
};
