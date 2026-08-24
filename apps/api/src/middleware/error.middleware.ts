import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { ApiError } from "../utils/api-error.js";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // =================================
  // Multer Errors
  // =================================

  if (error instanceof multer.MulterError) {
    // File too large
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,

        error: {
          code: "RESUME_FILE_TOO_LARGE",

          message: `Resume must be smaller than ${
            process.env.MAX_RESUME_SIZE_MB ?? 5
          } MB`,

          details: null,
        },
      });
    }

    // More files than allowed
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,

        error: {
          code: "TOO_MANY_FILES",
          message: "Only one resume file can be uploaded",
          details: null,
        },
      });
    }

    // Wrong field name
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,

        error: {
          code: "UNEXPECTED_FILE",
          message:
            'Unexpected file field. Use "resume" as the file field name.',
          details: null,
        },
      });
    }

    // Other Multer errors
    return res.status(400).json({
      success: false,

      error: {
        code: "FILE_UPLOAD_ERROR",
        message: error.message,
        details: null,
      },
    });
  }

  // =================================
  // Custom API Errors
  // =================================

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,

      error: {
        code: error.code ?? "API_ERROR",
        message: error.message,
        details: error.details ?? null,
      },
    });
  }

  // =================================
  // Unknown / Internal Errors
  // =================================

  console.error("Unhandled error:", error);

  return res.status(500).json({
    success: false,

    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      details: null,
    },
  });
};
