import type { Request, Response } from "express";

import { ApiError } from "../../utils/api-error.js";

import {
  getCandidateProfile,
  updateCandidateProfile,
} from "./candidate.service.js";

import type { UpdateCandidateProfileInput } from "./candidate.validation.js";

// ======================================
// GET PROFILE
// ======================================

export const getCandidateProfileController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const profile = await getCandidateProfile(userId);

  return res.status(200).json({
    success: true,

    data: {
      profile,
    },
  });
};

// ======================================
// UPDATE PROFILE
// ======================================

export const updateCandidateProfileController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const input = req.body as UpdateCandidateProfileInput;

  const profile = await updateCandidateProfile(userId, input);

  return res.status(200).json({
    success: true,

    message: "Candidate profile updated successfully",

    data: {
      profile,
    },
  });
};
