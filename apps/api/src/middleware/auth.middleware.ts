import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../modules/auth/auth.token.js";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authorization = req.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "Authentication required",
        "AUTHENTICATION_REQUIRED",
      );
    }

    const token = authorization.substring(7);

    const payload = verifyAccessToken(token);

    const session = await prisma.session.findUnique({
      where: {
        id: payload.sessionId,
      },

      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,

        user: {
          select: {
            status: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.userId !== payload.userId) {
      throw new ApiError(
        401,
        "Invalid authentication session",
        "INVALID_SESSION",
      );
    }

    if (session.status !== "ACTIVE") {
      throw new ApiError(
        401,
        "Session is no longer active",
        "SESSION_INACTIVE",
      );
    }

    if (session.expiresAt <= new Date()) {
      throw new ApiError(401, "Session has expired", "SESSION_EXPIRED");
    }

    if (session.user.status !== "ACTIVE") {
      throw new ApiError(
        403,
        "This account is currently unavailable",
        "ACCOUNT_UNAVAILABLE",
      );
    }

    req.auth = {
      userId: payload.userId,
      role: session.user.role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
};
