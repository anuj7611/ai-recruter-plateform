import { toFile } from "@imagekit/nodejs";

import { imagekit } from "./storage.client.js";
import { ApiError } from "../../utils/api-error.js";

interface UploadFileInput {
  file: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
}

export const uploadFile = async ({
  file,
  fileName,
  folder,
  tags = [],
}: UploadFileInput) => {
  const uploadableFile = await toFile(file, fileName);

  const uploaded = await imagekit.files.upload({
    file: uploadableFile,
    fileName,
    folder,
    tags,
  });

  // ImageKit marks these fields as optional in its SDK response, while every
  // successfully persisted file in this application requires both values.
  if (!uploaded.fileId || !uploaded.filePath) {
    if (uploaded.fileId) {
      try {
        await imagekit.files.delete(uploaded.fileId);
      } catch (cleanupError) {
        console.error("Failed to clean up incomplete upload:", cleanupError);
      }
    }

    throw new ApiError(
      502,
      "Storage provider returned an incomplete upload response",
      "STORAGE_UPLOAD_INCOMPLETE",
    );
  }

  return {
    fileId: uploaded.fileId,
    name: uploaded.name,
    url: uploaded.url,
    thumbnailUrl: uploaded.thumbnailUrl,
    filePath: uploaded.filePath,
    size: uploaded.size,
  };
};

export const deleteFile = async (fileId: string) => {
  await imagekit.files.delete(fileId);
};

export const downloadFile = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
};
