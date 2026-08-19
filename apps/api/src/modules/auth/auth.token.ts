import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { ApiError } from "../../utils/api-error.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.constants.js";


interface CreateAccessTokenInput {
  userId: string;
  role: string;
  sessionId: string;
}

interface CreateRefreshTokenInput {
  userId: string;
  sessionId: string;
}

export interface VerifiedAccessToken {
  userId: string;
  role: string;
  sessionId: string;
}

export interface VerifiedRefreshToken {
  userId: string;
  sessionId: string;
}

// ====================================
// SECRETS
// ====================================

const getAccessTokenSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  return secret;
};

const getRefreshTokenSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  return secret;
};

// ====================================
// CREATE ACCESS TOKEN
// ====================================

export const createAccessToken = ({
  userId,
  role,
  sessionId,
}: CreateAccessTokenInput): string => {
  return jwt.sign(
    {
      role,
      sessionId,
      tokenType: "access",
    },
    getAccessTokenSecret(),
    {
      algorithm: "HS256",

      subject: userId,

      issuer: JWT_ISSUER,

      audience: JWT_AUDIENCE,

      jwtid: randomUUID(),

      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  );
};

// ====================================
// CREATE REFRESH TOKEN
// ====================================

export const createRefreshToken = ({
  userId,
  sessionId,
}: CreateRefreshTokenInput): string => {
  return jwt.sign(
    {
      sessionId,
      tokenType: "refresh",
    },
    getRefreshTokenSecret(),
    {
      algorithm: "HS256",

      subject: userId,

      issuer: JWT_ISSUER,

      audience: JWT_AUDIENCE,

      jwtid: randomUUID(),

      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    },
  );
};

// ====================================
// VERIFY ACCESS TOKEN
// ====================================

export const verifyAccessToken = (token: string): VerifiedAccessToken => {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, getAccessTokenSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired access token",
      "INVALID_ACCESS_TOKEN",
    );
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.sessionId !== "string" ||
    payload.tokenType !== "access"
  ) {
    throw new ApiError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }

  return {
    userId: payload.sub,
    role: payload.role,
    sessionId: payload.sessionId,
  };
};

// ====================================
// VERIFY REFRESH TOKEN
// ====================================

export const verifyRefreshToken = (token: string): VerifiedRefreshToken => {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, getRefreshTokenSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired refresh token",
      "INVALID_REFRESH_TOKEN",
    );
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.sessionId !== "string" ||
    payload.tokenType !== "refresh"
  ) {
    throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sessionId,
  };
};
