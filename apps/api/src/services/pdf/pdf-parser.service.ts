import { extractText, getDocumentProxy } from "unpdf";

import { ApiError } from "../../utils/api-error.js";

export interface ParsedPdfResult {
  text: string;
  totalPages: number;
  wordCount: number;
  characterCount: number;
}

const cleanPdfText = (text: string): string => {
  return (
    text
      // Windows line endings
      .replace(/\r\n/g, "\n")

      // Mac line endings
      .replace(/\r/g, "\n")

      // Remove null characters
      .replace(/\u0000/g, "")

      // Replace repeated spaces/tabs
      .replace(/[ \t]+/g, " ")

      // Remove spaces before new line
      .replace(/ +\n/g, "\n")

      // Maximum two consecutive new lines
      .replace(/\n{3,}/g, "\n\n")

      .trim()
  );
};

const calculateWordCount = (text: string): number => {
  if (!text.trim()) {
    return 0;
  }

  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const extractPdfText = async (
  buffer: Buffer,
): Promise<ParsedPdfResult> => {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));

    const result = await extractText(pdf, {
      mergePages: true,
    });

    const cleanedText = cleanPdfText(result.text);

    if (!cleanedText) {
      throw new ApiError(
        422,
        "No readable text could be extracted from this resume",
        "RESUME_TEXT_NOT_FOUND",
      );
    }

    return {
      text: cleanedText,

      totalPages: result.totalPages,

      wordCount: calculateWordCount(cleanedText),

      characterCount: cleanedText.length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("PDF parsing failed:", error);

    throw new ApiError(
      422,
      "Unable to read the uploaded PDF",
      "PDF_PARSING_FAILED",
    );
  }
};
