import { prisma } from "../../lib/prisma.js";
import { sendAccountInvitationEmail } from "../../services/email/email.service.js";
import { ApiError } from "../../utils/api-error.js";
import { generateSecureToken, hashToken } from "../../utils/security/crypto.js";
import { hashPassword } from "../../utils/security/password.js";
import { ACCOUNT_INVITATION_TTL_MS } from "./auth.constants.js";
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
} from "./auth.validation.js";

type InviterRole = "ORGANIZATION_ADMIN" | "SUPER_ADMIN";
type InvitationRole = "RECRUITER" | "ORGANIZATION_ADMIN" | "SUPER_ADMIN";

export const createAccountInvitation = async (
  input: CreateInvitationInput,
  inviter: { id: string; role: InviterRole },
) => {
  if (inviter.role !== "SUPER_ADMIN" && input.role !== "RECRUITER") {
    throw new ApiError(
      403,
      "You cannot invite a user with this role",
      "INVITATION_ROLE_FORBIDDEN",
    );
  }

  const [existingUser, inviterUser] = await Promise.all([
    prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: inviter.id },
      select: { name: true },
    }),
  ]);

  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists",
      "EMAIL_ALREADY_EXISTS",
    );
  }

  if (!inviterUser) {
    throw new ApiError(404, "Inviting user not found", "USER_NOT_FOUND");
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + ACCOUNT_INVITATION_TTL_MS);

  const invitation = await prisma.$transaction(async (transaction) => {
    await transaction.accountInvitation.deleteMany({
      where: { email: input.email, acceptedAt: null },
    });

    return transaction.accountInvitation.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        tokenHash: hashToken(token),
        invitedById: inviter.id,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  });

  let invitationEmailSent = true;
  try {
    await sendAccountInvitationEmail({
      email: invitation.email,
      name: invitation.name,
      inviterName: inviterUser.name,
      role: invitation.role,
      invitationToken: token,
    });
  } catch (error) {
    invitationEmailSent = false;
    console.error("Could not send account invitation:", error);
  }

  const webUrl = (process.env.WEB_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  return {
    invitation,
    invitationEmailSent,
    manualInvitationUrl:
      !invitationEmailSent && process.env.NODE_ENV !== "production"
        ? `${webUrl}/accept-invitation?token=${encodeURIComponent(token)}`
        : null,
  };
};

export const getAccountInvitation = async (token: string) => {
  const invitation = await prisma.accountInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      name: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) {
    throw new ApiError(400, "Invitation is invalid", "INVALID_INVITATION");
  }

  if (invitation.acceptedAt) {
    throw new ApiError(
      400,
      "Invitation has already been accepted",
      "INVITATION_ALREADY_ACCEPTED",
    );
  }

  if (invitation.expiresAt <= new Date()) {
    throw new ApiError(400, "Invitation has expired", "INVITATION_EXPIRED");
  }

  return {
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    invitedByName: invitation.invitedBy.name,
  };
};

export const acceptAccountInvitation = async (
  input: AcceptInvitationInput,
  expectedRole?: InvitationRole,
) => {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.accountInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });

  if (!invitation || invitation.acceptedAt) {
    throw new ApiError(400, "Invitation is invalid", "INVALID_INVITATION");
  }

  if (invitation.expiresAt <= new Date()) {
    throw new ApiError(400, "Invitation has expired", "INVITATION_EXPIRED");
  }

  if (invitation.role === "CANDIDATE") {
    throw new ApiError(400, "Invitation role is invalid", "INVALID_INVITATION");
  }

  if (expectedRole && invitation.role !== expectedRole) {
    throw new ApiError(
      403,
      "This invitation belongs to a different registration portal",
      "INVITATION_ROLE_MISMATCH",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  try {
    return await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.accountInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });

      if (claimed.count !== 1) {
        throw new ApiError(
          400,
          "Invitation is invalid or has already been used",
          "INVALID_INVITATION",
        );
      }

      return transaction.user.create({
        data: {
          name: invitation.name,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          emailVerifiedAt: now,
          ...(invitation.role === "RECRUITER"
            ? { recruiterProfile: { create: {} } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          recruiterProfile: { select: { id: true } },
        },
      });
    });
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
