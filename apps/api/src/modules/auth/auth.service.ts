import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { hashPassword, verifyPassword } from "../../utils/security/password.js";
import {
  REFRESH_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_MS,
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
  VerifyEmailInput,
} from "./auth.validation.js";
import { sendVerificationEmail } from "../../services/email/email.service.js";
import { generateSecureToken, hashToken } from "../../utils/security/crypto.js";

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

  // ------------------------------
  // Verify password
  // ------------------------------

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
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

  // ------------------------------
  // Create session ID
  // ------------------------------

  const sessionId = randomUUID();

  // ------------------------------
  // Generate JWTs
  // ------------------------------

  const accessToken = createAccessToken({
    userId: user.id,
    role: user.role,
    sessionId,
  });

  const refreshToken = createRefreshToken({
    userId: user.id,
    sessionId,
  });

  // ------------------------------
  // Hash refresh JWT
  // ------------------------------

  const refreshTokenHash = hashToken(refreshToken);

  // ------------------------------
  // Refresh expiry
  // ------------------------------

  const refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  // ------------------------------
  // Store session + update login
  // ------------------------------

  await prisma.$transaction([
    prisma.session.create({
      data: {
        id: sessionId,

        userId: user.id,

        refreshTokenHash,

        status: "ACTIVE",

        ipAddress: metadata.ipAddress,

        userAgent: metadata.userAgent,

        expiresAt: refreshTokenExpiresAt,

        lastUsedAt: new Date(),
      },
    }),

    prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        lastLoginAt: new Date(),
      },
    }),
  ]);

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

    accessToken,

    refreshToken,

    refreshTokenExpiresAt,
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
