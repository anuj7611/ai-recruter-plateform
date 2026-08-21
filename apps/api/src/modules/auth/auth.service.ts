import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { hashPassword, verifyPassword } from "../../utils/security/password.js";
import {
  ACCOUNT_LOCK_TTL_MS,
  REFRESH_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  PASSWORD_RESET_TTL_MS,
} from "./auth.constants.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "./auth.token.js";
import type { LoginMetadata } from "./auth.types.js";
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validation.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../services/email/email.service.js";
import { generateSecureToken, hashToken } from "../../utils/security/crypto.js";

const getDeviceName = (userAgent: string | null): string | null => {
  if (!userAgent) return null;

  const browser =
    userAgent.match(/Edg\/([\d.]+)/)?.[0] ??
    userAgent.match(/Chrome\/([\d.]+)/)?.[0] ??
    userAgent.match(/Firefox\/([\d.]+)/)?.[0] ??
    userAgent.match(/Version\/([\d.]+).*Safari/)?.[0]?.split(" ")[0] ??
    "Unknown browser";
  const os =
    userAgent.match(/Windows NT [\d.]+/)?.[0] ??
    userAgent.match(/Android [\d.]+/)?.[0] ??
    userAgent.match(/(?:iPhone|CPU) OS [\d_]+/)?.[0] ??
    userAgent.match(/Mac OS X [\d_]+/)?.[0] ??
    (userAgent.includes("Linux") ? "Linux" : "Unknown device");

  return `${browser} on ${os}`.slice(0, 160);
};

export const createAuthSession = async (
  userId: string,
  role: string,
  metadata: LoginMetadata,
) => {
  const sessionId = randomUUID();
  const accessToken = createAccessToken({ userId, role, sessionId });
  const refreshToken = createRefreshToken({ userId, sessionId });
  const refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  await prisma.$transaction([
    prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: hashToken(refreshToken),
        status: "ACTIVE",
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceName: getDeviceName(metadata.userAgent),
        expiresAt: refreshTokenExpiresAt,
        lastUsedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
  ]);

  return { accessToken, refreshToken, refreshTokenExpiresAt };
};

// ====================================
// REGISTER
// ====================================

export const registerUser = async (input: RegisterInput) => {
  const { name, email, password } = input;

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },

    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists",
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,

        candidateProfile: {
          create: {},
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,

        candidateProfile: {
          select: {
            id: true,
            experienceYears: true,
            experienceLevel: true,
          },
        },
      },
    });

    let verificationEmailSent = true;

    try {
      await createEmailVerification(user.id);
    } catch (error) {
      verificationEmailSent = false;
      console.error("Could not send verification email:", error);
    }

    return {
      user,
      verificationEmailSent,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "An account with this email already exists",
        "EMAIL_ALREADY_EXISTS",
      );
    }

    throw error;
  }
};

// ====================================
// LOGIN
// ====================================

export const loginUser = async (input: LoginInput, metadata: LoginMetadata) => {
  const { email, password } = input;

  // ------------------------------
  // Find user
  // ------------------------------

  const user = await prisma.user.findUnique({
    where: {
      email,
    },

    select: {
      id: true,
      name: true,
      email: true,

      passwordHash: true,

      avatarUrl: true,

      role: true,
      status: true,
      failedLoginAttempts: true,
      lockedUntil: true,

      emailVerifiedAt: true,

      candidateProfile: {
        select: {
          id: true,
        },
      },

      recruiterProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  /*
   * We intentionally use the same
   * message for:
   *
   * - nonexistent user
   * - OAuth-only user
   * - wrong password
   */

  if (!user || !user.passwordHash) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    throw new ApiError(
      429,
      "Too many failed login attempts. Try again later.",
      "ACCOUNT_TEMPORARILY_LOCKED",
      { retryAfterSeconds: Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000) },
    );
  }

  const previousFailedAttempts = user.lockedUntil ? 0 : user.failedLoginAttempts;

  // ------------------------------
  // Verify password
  // ------------------------------

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
    const failedLoginAttempts = previousFailedAttempts + 1;
    const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : failedLoginAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + ACCOUNT_LOCK_TTL_MS)
          : null,
      },
    });

    if (shouldLock) {
      throw new ApiError(
        429,
        "Too many failed login attempts. Try again later.",
        "ACCOUNT_TEMPORARILY_LOCKED",
        { retryAfterSeconds: Math.ceil(ACCOUNT_LOCK_TTL_MS / 1000) },
      );
    }

    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  // ------------------------------
  // Account status
  // ------------------------------

  if (user.status !== "ACTIVE") {
    throw new ApiError(
      403,
      "This account is currently unavailable",
      "ACCOUNT_UNAVAILABLE",
    );
  }

  const authSession = await createAuthSession(user.id, user.role, metadata);

  // ------------------------------
  // Return safe data only
  // ------------------------------

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,

      avatarUrl: user.avatarUrl,

      role: user.role,
      status: user.status,

      emailVerifiedAt: user.emailVerifiedAt,

      candidateProfile: user.candidateProfile,

      recruiterProfile: user.recruiterProfile,
    },

    ...authSession,
  };
};

// ====================================
// REFRESH AUTH SESSION
// ====================================

export const refreshAuthSession = async (
  refreshToken: string,
  metadata: LoginMetadata,
) => {
  // --------------------------------
  // Verify JWT
  // --------------------------------

  const payload = verifyRefreshToken(refreshToken);

  const currentTokenHash = hashToken(refreshToken);

  // --------------------------------
  // Find session
  // --------------------------------

  const session = await prisma.session.findUnique({
    where: {
      id: payload.sessionId,
    },

    select: {
      id: true,
      userId: true,

      refreshTokenHash: true,

      status: true,

      expiresAt: true,

      user: {
        select: {
          id: true,
          role: true,
          status: true,
        },
      },
    },
  });

  // --------------------------------
  // Validate session
  // --------------------------------

  if (!session || session.userId !== payload.userId) {
    throw new ApiError(401, "Invalid refresh session", "INVALID_REFRESH_TOKEN");
  }

  if (session.status !== "ACTIVE") {
    throw new ApiError(401, "Session is no longer active", "SESSION_INACTIVE");
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.update({
      where: {
        id: session.id,
      },

      data: {
        status: "EXPIRED",
      },
    });

    throw new ApiError(401, "Session has expired", "SESSION_EXPIRED");
  }

  // --------------------------------
  // Check stored token hash
  // --------------------------------

  if (session.refreshTokenHash !== currentTokenHash) {
    throw new ApiError(
      401,
      "Refresh token is no longer valid",
      "REFRESH_TOKEN_REUSED",
    );
  }

  // --------------------------------
  // Check account
  // --------------------------------

  if (session.user.status !== "ACTIVE") {
    throw new ApiError(
      403,
      "This account is currently unavailable",
      "ACCOUNT_UNAVAILABLE",
    );
  }

  // --------------------------------
  // Generate rotated JWTs
  // --------------------------------

  const newAccessToken = createAccessToken({
    userId: session.user.id,

    role: session.user.role,

    sessionId: session.id,
  });

  const newRefreshToken = createRefreshToken({
    userId: session.user.id,

    sessionId: session.id,
  });

  const newRefreshTokenHash = hashToken(newRefreshToken);

  const newRefreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  // --------------------------------
  // Atomic token rotation
  // --------------------------------

  const rotationResult = await prisma.session.updateMany({
    where: {
      id: session.id,

      userId: session.userId,

      status: "ACTIVE",

      refreshTokenHash: currentTokenHash,

      expiresAt: {
        gt: new Date(),
      },
    },

    data: {
      refreshTokenHash: newRefreshTokenHash,

      expiresAt: newRefreshTokenExpiresAt,

      lastUsedAt: new Date(),

      ipAddress: metadata.ipAddress,

      userAgent: metadata.userAgent,

      deviceName: getDeviceName(metadata.userAgent),
    },
  });

  if (rotationResult.count !== 1) {
    throw new ApiError(
      401,
      "Refresh token is no longer valid",
      "REFRESH_TOKEN_REUSED",
    );
  }

  return {
    accessToken: newAccessToken,

    refreshToken: newRefreshToken,

    refreshTokenExpiresAt: newRefreshTokenExpiresAt,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,

      candidateProfile: true,

      recruiterProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return user;
};

export const logoutSession = async (userId: string, sessionId: string) => {
  await prisma.session.updateMany({
    where: {
      id: sessionId,
      userId,
      status: "ACTIVE",
    },

    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });
};

export const logoutAllSessions = async (userId: string) => {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      status: "ACTIVE",
    },

    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  return {
    revokedSessions: result.count,
  };
};

export const createEmailVerification = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (user.emailVerifiedAt) {
    throw new ApiError(
      400,
      "Email is already verified",
      "EMAIL_ALREADY_VERIFIED",
    );
  }

  const token = generateSecureToken();

  const tokenHash = hashToken(token);

  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    }),

    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationToken: token,
  });
};

export const verifyUserEmail = async (input: VerifyEmailInput) => {
  const tokenHash = hashToken(input.token);

  const verification = await prisma.emailVerificationToken.findUnique({
    where: {
      tokenHash,
    },

    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,

      user: {
        select: {
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!verification || verification.usedAt) {
    throw new ApiError(
      400,
      "Verification token is invalid",
      "INVALID_VERIFICATION_TOKEN",
    );
  }

  if (verification.expiresAt <= new Date()) {
    throw new ApiError(
      400,
      "Verification token has expired",
      "VERIFICATION_TOKEN_EXPIRED",
    );
  }

  if (verification.user.emailVerifiedAt) {
    throw new ApiError(
      400,
      "Email is already verified",
      "EMAIL_ALREADY_VERIFIED",
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: verification.userId,
      },

      data: {
        emailVerifiedAt: now,
      },
    }),

    prisma.emailVerificationToken.update({
      where: {
        id: verification.id,
      },

      data: {
        usedAt: now,
      },
    }),
  ]);

  return {
    verified: true,
  };
};

// ====================================
// PASSWORD RESET
// ====================================

export const requestPasswordReset = async (input: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      status: true,
    },
  });

  // Always return the same result so this endpoint cannot enumerate accounts.
  if (!user || !user.passwordHash || user.status !== "ACTIVE") return;

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      },
    }),
  ]);

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken: token,
    });
  } catch (error) {
    console.error("Could not send password reset email:", error);
  }
};

export const resetPassword = async (input: ResetPasswordInput) => {
  const tokenHash = hashToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { status: true } },
    },
  });

  if (!resetToken || resetToken.usedAt) {
    throw new ApiError(400, "Reset token is invalid", "INVALID_RESET_TOKEN");
  }

  if (resetToken.expiresAt <= new Date()) {
    throw new ApiError(400, "Reset token has expired", "RESET_TOKEN_EXPIRED");
  }

  if (resetToken.user.status !== "ACTIVE") {
    throw new ApiError(
      403,
      "This account is currently unavailable",
      "ACCOUNT_UNAVAILABLE",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.session.updateMany({
      where: { userId: resetToken.userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now },
    }),
  ]);

  return { passwordReset: true };
};

// ====================================
// DEVICE SESSIONS
// ====================================

export const getUserSessions = async (
  userId: string,
  currentSessionId: string,
) => {
  const now = new Date();

  await prisma.session.updateMany({
    where: { userId, status: "ACTIVE", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      ipAddress: true,
      deviceName: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });

  return sessions.map((session) => ({
    ...session,
    isCurrent: session.id === currentSessionId,
  }));
};

export const revokeUserSession = async (
  userId: string,
  sessionId: string,
) => {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  if (result.count !== 1) {
    throw new ApiError(404, "Active session not found", "SESSION_NOT_FOUND");
  }
};
