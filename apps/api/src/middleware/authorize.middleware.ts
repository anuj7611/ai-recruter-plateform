import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

export const APP_ROLES = ["CANDIDATE", "RECRUITER", "SUPER_ADMIN"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const authorizeRoles =
  (...allowedRoles: AppRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth;

    if (!auth) {
      return next(
        new ApiError(401, "Authentication required", "AUTHENTICATION_REQUIRED"),
      );
    }

    const role = auth.role as AppRole;

    if (!allowedRoles.includes(role)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to access this resource",
          "FORBIDDEN",
        ),
      );
    }

    next();
  };
