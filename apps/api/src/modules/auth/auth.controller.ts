import type { Request, Response } from "express";
import { REFRESH_COOKIE_NAME } from "./auth.constants.js";
import {
  loginUser,
  registerUser,
  refreshAuthSession,
  getCurrentUser,
  logoutAllSessions,
  logoutSession,
  verifyUserEmail,
  createEmailVerification,
} from "./auth.service.js";
import type {
  LoginInput,
  RegisterInput,
  VerifyEmailInput,
} from "./auth.validation.js";

// ====================================
// REGISTER
// ====================================

export const registerController = async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;

  const { user, verificationEmailSent } = await registerUser(input);

  return res.status(201).json({
    success: true,

    message: verificationEmailSent
      ? "Account created successfully. Check your email to verify your account."
      : "Account created, but the verification email could not be sent. Please use resend verification.",

    data: {
      user,
      verificationEmailSent,
    },
  });
};

// ====================================
// LOGIN
// ====================================

export const loginController = async (req: Request, res: Response) => {
  const input = req.body as LoginInput;

  const result = await loginUser(input, {
    ipAddress: req.ip ?? null,

    userAgent: req.get("user-agent") ?? null,
  });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    expires: result.refreshTokenExpiresAt,

    path: "/api/v1/auth",
  });

  return res.status(200).json({
    success: true,

    message: "Logged in successfully",

    data: {
      user: result.user,

      accessToken: result.accessToken,
    },
  });
};

// ====================================
// REFRESH
// ====================================

export const refreshController = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(401).json({
      success: false,

      error: {
        code: "REFRESH_TOKEN_MISSING",

        message: "Refresh token is missing",
      },
    });
  }

  const result = await refreshAuthSession(refreshToken, {
    ipAddress: req.ip ?? null,

    userAgent: req.get("user-agent") ?? null,
  });

  // Replace old refresh cookie
  // with the newly rotated JWT.

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    expires: result.refreshTokenExpiresAt,

    path: "/api/v1/auth",
  });

  return res.status(200).json({
    success: true,

    message: "Access token refreshed successfully",

    data: {
      accessToken: result.accessToken,
    },
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path: "/api/v1/auth",
  });
};

export const meController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,

      error: {
        code: "AUTHENTICATION_REQUIRED",

        message: "Authentication required",
      },
    });
  }

  const user = await getCurrentUser(userId);

  return res.status(200).json({
    success: true,

    data: {
      user,
    },
  });
};

export const logoutController = async (req: Request, res: Response) => {
  const auth = req.auth;

  if (!auth) {
    return res.status(401).json({
      success: false,

      error: {
        code: "AUTHENTICATION_REQUIRED",

        message: "Authentication required",
      },
    });
  }

  await logoutSession(auth.userId, auth.sessionId);

  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,

    message: "Logged out successfully",
  });
};

export const logoutAllController = async (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,

      error: {
        code: "AUTHENTICATION_REQUIRED",

        message: "Authentication required",
      },
    });
  }

  const result = await logoutAllSessions(userId);

  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,

    message: "Logged out from all devices",

    data: result,
  });
};

export const verifyEmailController = async (req: Request, res: Response) => {
  const input = req.body as VerifyEmailInput;

  await verifyUserEmail(input);

  return res.status(200).json({
    success: true,

    message: "Email verified successfully",
  });
};

export const resendVerificationController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,

      error: {
        code: "AUTHENTICATION_REQUIRED",

        message: "Authentication required",
      },
    });
  }

  await createEmailVerification(userId);

  return res.status(200).json({
    success: true,

    message: "Verification email sent",
  });
};
