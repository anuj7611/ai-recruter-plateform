import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import type { Prisma } from "../../generated/prisma/client.js";

import type { UpdateCandidateProfileInput } from "./candidate.validation.js";

// ======================================
// GET PROFILE
// ======================================

export const getCandidateProfile = async (userId: string) => {
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
      emailVerifiedAt: true,
      createdAt: true,

      candidateProfile: {
        select: {
          id: true,

          headline: true,
          bio: true,

          currentRole: true,
          targetRole: true,

          experienceYears: true,
          experienceLevel: true,

          location: true,

          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,

          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (!user.candidateProfile) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  return user;
};

// ======================================
// UPDATE PROFILE
// ======================================

export const updateCandidateProfile = async (
  userId: string,
  input: UpdateCandidateProfileInput,
) => {
  const profile = await prisma.candidateProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
    },
  });

  if (!profile) {
    throw new ApiError(
      404,
      "Candidate profile not found",
      "CANDIDATE_PROFILE_NOT_FOUND",
    );
  }

  // With exactOptionalPropertyTypes enabled, Prisma accepts an omitted update
  // field but not a field whose value is explicitly `undefined`.
  const data: Prisma.CandidateProfileUpdateInput = {};

  if (input.headline !== undefined) data.headline = input.headline;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.currentRole !== undefined) data.currentRole = input.currentRole;
  if (input.targetRole !== undefined) data.targetRole = input.targetRole;
  if (input.experienceYears !== undefined) {
    data.experienceYears = input.experienceYears;
  }
  if (input.experienceLevel !== undefined) {
    data.experienceLevel = input.experienceLevel;
  }
  if (input.location !== undefined) data.location = input.location;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl;
  if (input.githubUrl !== undefined) data.githubUrl = input.githubUrl;
  if (input.portfolioUrl !== undefined) data.portfolioUrl = input.portfolioUrl;

  return prisma.candidateProfile.update({
    where: {
      userId,
    },

    data,

    select: {
      id: true,

      headline: true,
      bio: true,

      currentRole: true,
      targetRole: true,

      experienceYears: true,
      experienceLevel: true,

      location: true,

      linkedinUrl: true,
      githubUrl: true,
      portfolioUrl: true,

      createdAt: true,
      updatedAt: true,
    },
  });
};
