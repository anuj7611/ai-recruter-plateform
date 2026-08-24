import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { hashText } from "../../utils/security/crypto.js";

type ResumeSection =
  | "SUMMARY"
  | "SKILLS"
  | "EXPERIENCE"
  | "EDUCATION"
  | "PROJECTS"
  | "CERTIFICATIONS"
  | "ACHIEVEMENTS"
  | "LANGUAGES"
  | "OTHER";

interface SectionDocument {
  section: ResumeSection;

  text: string;

  metadata: Record<string, string | number | boolean | null>;
}

interface GeneratedChunk {
  chunkIndex: number;

  section: ResumeSection;

  text: string;

  contentHash: string;

  metadata: Record<string, string | number | boolean | null>;
}

const getChunkConfig = () => {
  const chunkSize = Number(process.env.RESUME_CHUNK_SIZE ?? 900);

  const chunkOverlap = Number(process.env.RESUME_CHUNK_OVERLAP ?? 120);

  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error("RESUME_CHUNK_SIZE must be a positive number");
  }

  if (!Number.isFinite(chunkOverlap) || chunkOverlap < 0) {
    throw new Error("RESUME_CHUNK_OVERLAP must be zero or greater");
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error(
      "RESUME_CHUNK_OVERLAP must be smaller than RESUME_CHUNK_SIZE",
    );
  }

  return {
    chunkSize,
    chunkOverlap,
  };
};

const cleanChunkText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const createResumeChunks = async (
  documents: SectionDocument[],
): Promise<GeneratedChunk[]> => {
  const { chunkSize, chunkOverlap } = getChunkConfig();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,

    chunkOverlap,

    separators: ["\n\n", "\n", ". ", ", ", " ", ""],
  });

  const generatedChunks: GeneratedChunk[] = [];

  let globalChunkIndex = 0;

  for (const document of documents) {
    const cleanedText = cleanChunkText(document.text);

    if (!cleanedText) {
      continue;
    }

    const splits = await splitter.splitText(cleanedText);

    for (let localIndex = 0; localIndex < splits.length; localIndex++) {
      const chunkText = cleanChunkText(splits[localIndex] ?? "");

      if (!chunkText) {
        continue;
      }

      generatedChunks.push({
        chunkIndex: globalChunkIndex,

        section: document.section,

        text: chunkText,

        contentHash: hashText(chunkText),

        metadata: {
          ...document.metadata,

          localChunkIndex: localIndex,

          globalChunkIndex: globalChunkIndex,
        },
      });

      globalChunkIndex++;
    }
  }

  return generatedChunks;
};
