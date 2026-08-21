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
  type AuthPortalRole,
} from "./auth.service.js";
import type {
  ForgotPasswordInput,
  AcceptInvitationInput,
  CreateInvitationInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validation.js";
import { generateSecureToken } from "../../utils/security/crypto.js";
import { ApiError } from "../../utils/api-error.js";
import { completeOAuthLogin, getOAuthAuthorizationUrl } from "./auth.oauth.js";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./auth.types.js";
import {
  acceptAccountInvitation,
  createAccountInvitation,
  getAccountInvitation,
} from "./auth.invitation.js";

const setRefreshCookie = (
  res: Response,
  refreshToken: string,
  expires: Date,
) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires,
    path: "/api/v1/auth",
  });
};

// ====================================
// REGISTER
// ====================================

const registerForRole = async (
  req: Request,
  res: Response,
  role: "CANDIDATE" | "RECRUITER",
) => {
  const input = req.body as RegisterInput;

  const { user, verificationEmailSent } = await registerUser(input, role);

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

export const candidateRegisterController = (req: Request, res: Response) =>
  registerForRole(req, res, "CANDIDATE");

export const recruiterRegisterController = (req: Request, res: Response) =>
  registerForRole(req, res, "RECRUITER");

// ====================================
// LOGIN
// ====================================

const loginForRole = async (
  req: Request,
  res: Response,
  expectedRole?: AuthPortalRole,
) => {
  const input = req.body as LoginInput;

  const result = await loginUser(input, {
    ipAddress: req.ip ?? null,

    userAgent: req.get("user-agent") ?? null,
  }, expectedRole);

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

export const candidateLoginController = (req: Request, res: Response) =>
  loginForRole(req, res, "CANDIDATE");

export const recruiterLoginController = (req: Request, res: Response) =>
  loginForRole(req, res, "RECRUITER");

export const organizationAdminLoginController = (
  req: Request,
  res: Response,
) => loginForRole(req, res, "ORGANIZATION_ADMIN");

export const superAdminLoginController = (req: Request, res: Response) =>
  loginForRole(req, res, "SUPER_ADMIN");

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

    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

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
    message:
      "If an eligible account exists, a password reset email has been sent.",
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
  if (!auth)
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );

  const sessions = await getUserSessions(auth.userId, auth.sessionId);
  return res.status(200).json({ success: true, data: { sessions } });
};

export const revokeSessionController = async (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth)
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );

  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  if (!sessionId)
    throw new ApiError(400, "Session ID is required", "VALIDATION_ERROR");

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
    throw new ApiError(
      404,
      "OAuth provider not supported",
      "OAUTH_PROVIDER_NOT_SUPPORTED",
    );
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
  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
  const frontendCallback = new URL(
    "/auth/callback",
    `${webUrl.replace(/\/$/, "")}/`,
  );
  const clearOAuthStateCookie = () => {
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth/oauth",
    });
  };

  try {
    const providerError =
      typeof req.query.error === "string" ? req.query.error : null;
    if (providerError) {
      throw new ApiError(
        400,
        "OAuth authorization was cancelled or denied",
        providerError === "access_denied"
          ? "OAUTH_ACCESS_DENIED"
          : "OAUTH_PROVIDER_ERROR",
      );
    }

    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];

    if (!code || !state || storedState !== `${provider}:${state}`) {
      throw new ApiError(
        400,
        "OAuth state is invalid or expired",
        "INVALID_OAUTH_STATE",
      );
    }

    const result = await completeOAuthLogin(provider, code, {
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    frontendCallback.searchParams.set("oauth", "success");
    frontendCallback.searchParams.set("provider", provider);
    clearOAuthStateCookie();
    return res.redirect(frontendCallback.toString());
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("OAuth callback failed:", error);
    }

    frontendCallback.searchParams.set("oauth", "error");
    frontendCallback.searchParams.set(
      "code",
      error instanceof ApiError && error.code
        ? error.code
        : "OAUTH_CALLBACK_FAILED",
    );
    clearOAuthStateCookie();
    return res.redirect(frontendCallback.toString());
  }
};

export const createInvitationController = async (
  req: Request,
  res: Response,
) => {
  const auth = req.auth;
  if (
    !auth ||
    (auth.role !== "ORGANIZATION_ADMIN" && auth.role !== "SUPER_ADMIN")
  ) {
    throw new ApiError(403, "You cannot create invitations", "FORBIDDEN");
  }

  const result = await createAccountInvitation(
    req.body as CreateInvitationInput,
    { id: auth.userId, role: auth.role },
  );

  return res.status(201).json({
    success: true,
    message: result.invitationEmailSent
      ? "Invitation sent successfully"
      : "Invitation created, but email delivery failed",
    data: result,
  });
};

export const invitationDetailsController = async (
  req: Request,
  res: Response,
) => {
  const token = Array.isArray(req.params.token)
    ? req.params.token[0]
    : req.params.token;
  if (!token) {
    throw new ApiError(400, "Invitation token is required", "VALIDATION_ERROR");
  }

  const invitation = await getAccountInvitation(token);
  return res.status(200).json({ success: true, data: { invitation } });
};

export const acceptInvitationController = async (
  req: Request,
  res: Response,
) => {
  const user = await acceptAccountInvitation(req.body as AcceptInvitationInput);
  return res.status(201).json({
    success: true,
    message: "Invitation accepted. You can now sign in.",
    data: { user },
  });
};

const registerInvitedAdmin = async (
  req: Request,
  res: Response,
  role: "ORGANIZATION_ADMIN" | "SUPER_ADMIN",
) => {
  const user = await acceptAccountInvitation(
    req.body as AcceptInvitationInput,
    role,
  );

  return res.status(201).json({
    success: true,
    message: "Administrator account created. You can now sign in.",
    data: { user },
  });
};

export const organizationAdminRegisterController = (
  req: Request,
  res: Response,
) => registerInvitedAdmin(req, res, "ORGANIZATION_ADMIN");

export const superAdminRegisterController = (req: Request, res: Response) =>
  registerInvitedAdmin(req, res, "SUPER_ADMIN");
