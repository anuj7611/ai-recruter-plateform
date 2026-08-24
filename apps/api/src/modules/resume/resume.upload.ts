import multer from "multer";

import { ApiError } from "../../utils/api-error.js";

const maxResumeSizeMb = Number(process.env.MAX_RESUME_SIZE_MB ?? 5);

const maxResumeSizeBytes = maxResumeSizeMb * 1024 * 1024;

export const resumeUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: maxResumeSizeBytes,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      return callback(
        new ApiError(
          400,
          "Only PDF resumes are allowed",
          "INVALID_RESUME_FILE_TYPE",
        ),
      );
    }

    callback(null, true);
  },
});
