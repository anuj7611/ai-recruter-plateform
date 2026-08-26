import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import { generateInterviewQuestions } from "./interview-question.service.js";
import {
  createInterview,
  getRecruiterInterviewById,
  getRecruiterInterviews,
} from "./interview.service.js";

import type {
  CreateInterviewInput,
  InterviewParams,
} from "./interview.validation.js";

const getUserId = (req: Request) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  return userId;
};

// =====================================
// Create
// =====================================

export const createInterviewController = async (
  req: Request,
  res: Response,
) => {
  const interview = await createInterview(
    getUserId(req),

    req.body as CreateInterviewInput,
  );

  return res.status(201).json({
    success: true,

    message: "Interview created successfully",

    data: {
      interview,
    },
  });
};

// =====================================
// List
// =====================================

export const getInterviewsController = async (req: Request, res: Response) => {
  const interviews = await getRecruiterInterviews(getUserId(req));

  return res.status(200).json({
    success: true,

    data: {
      interviews,
    },
  });
};

// =====================================
// Details
// =====================================

export const getInterviewController = async (req: Request, res: Response) => {
  const { interviewId } = req.params as InterviewParams;

  const interview = await getRecruiterInterviewById(
    getUserId(req),

    interviewId,
  );

  return res.status(200).json({
    success: true,

    data: {
      interview,
    },
  });
};

// =====================================
// Generate Questions
// =====================================

export const generateInterviewQuestionsController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const interview = await generateInterviewQuestions(
    getUserId(req),

    interviewId,
  );

  return res.status(200).json({
    success: true,

    message: "Interview questions generated successfully",

    data: {
      interview,
    },
  });
};
