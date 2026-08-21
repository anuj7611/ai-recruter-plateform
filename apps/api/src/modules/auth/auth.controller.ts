import type { Request, Response } from "express";
import {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_MS,
  REFRESH_COOKIE_NAME,
} from "./auth.constants.js";
import {
  loginUser,
  registerUser,
  refreshAuthSession,
  getCurrentUser,
  logoutAllSessions,
  logoutSession,
  verifyUserEmail,
  createEmailVerification,
  getUserSessions,
  requestPasswordReset,
  resetPassword,
  revokeUserSession,
} from "./auth.service.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validation.js";
import { generateSecureToken } from "../../utils/security/crypto.js";
import { ApiError } from "../../utils/api-error.js";
import {
  completeOAuthLogin,
  getOAuthAuthorizationUrl,
} from "./auth.oauth.js";
import {
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "./auth.types.js";

const setRefreshCookie = (
  res: Response,
  refreshToken: string,
  expires: Date,
) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/api/v1/auth",
  });
};

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

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

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

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

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

export const forgotPasswordController = async (req: Request, res: Response) => {
  await requestPasswordReset(req.body as ForgotPasswordInput);

  return res.status(200).json({
    success: true,
    message: "If an eligible account exists, a password reset email has been sent.",
  });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  await resetPassword(req.body as ResetPasswordInput);
  clearRefreshCookie(res);

  return res.status(200).json({
    success: true,
    message: "Password reset successfully. Please sign in again.",
  });
};

export const sessionsController = async (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, "Authentication required", "AUTHENTICATION_REQUIRED");

  const sessions = await getUserSessions(auth.userId, auth.sessionId);
  return res.status(200).json({ success: true, data: { sessions } });
};

export const revokeSessionController = async (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth) throw new ApiError(401, "Authentication required", "AUTHENTICATION_REQUIRED");

  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  if (!sessionId) throw new ApiError(400, "Session ID is required", "VALIDATION_ERROR");

  await revokeUserSession(auth.userId, sessionId);
  if (sessionId === auth.sessionId) clearRefreshCookie(res);

  return res.status(200).json({
    success: true,
    message: "Device session revoked successfully",
  });
};

const parseOAuthProvider = (
  value: string | string[] | undefined,
): OAuthProvider => {
  if (
    typeof value !== "string" ||
    !OAUTH_PROVIDERS.includes(value as OAuthProvider)
  ) {
    throw new ApiError(404, "OAuth provider not supported", "OAUTH_PROVIDER_NOT_SUPPORTED");
  }
  return value as OAuthProvider;
};

export const oauthStartController = async (req: Request, res: Response) => {
  const provider = parseOAuthProvider(req.params.provider);
  const state = generateSecureToken();

  res.cookie(OAUTH_STATE_COOKIE_NAME, `${provider}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL_MS,
    path: "/api/v1/auth/oauth",
  });

  return res.redirect(getOAuthAuthorizationUrl(provider, state));
};

export const oauthCallbackController = async (req: Request, res: Response) => {
  const provider = parseOAuthProvider(req.params.provider);
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const storedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];

  if (!code || !state || storedState !== `${provider}:${state}`) {
    throw new ApiError(400, "OAuth state is invalid or expired", "INVALID_OAUTH_STATE");
  }

  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth/oauth",
  });

  const result = await completeOAuthLogin(provider, code, {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
  return res.redirect(`${webUrl.replace(/\/$/, "")}/auth/callback?oauth=success`);
};
