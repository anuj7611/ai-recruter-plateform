import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { ApiError } from "../utils/api-error.js";

export const validateBody =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new ApiError(
          400,
          "Request validation failed",
          "VALIDATION_ERROR",
          result.error.flatten(),
        ),
      );
    }

    req.body = result.data;

    next();
  };
