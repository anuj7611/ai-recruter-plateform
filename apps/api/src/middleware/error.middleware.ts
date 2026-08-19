import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/api-error.js";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
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

  console.error("Unhandled error:", error);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
};
