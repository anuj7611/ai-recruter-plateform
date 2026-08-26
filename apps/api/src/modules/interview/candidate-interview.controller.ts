import type { Request, Response } from "express";

import { ApiError } from "../../utils/api-error.js";

import {
  completeCandidateInterview,
  getCandidateCurrentQuestion,
  getCandidateInterviewResult,
  getCandidateInterviews,
  startCandidateInterview,
  submitCandidateInterviewAnswer,
} from "./candidate-interview.service.js";

import type {
  InterviewParams,
  SubmitInterviewAnswerInput,
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

export const getCandidateInterviewsController = async (
  req: Request,
  res: Response,
) => {
  const interviews = await getCandidateInterviews(getUserId(req));

  return res.status(200).json({
    success: true,

    data: {
      interviews,
    },
  });
};

export const startCandidateInterviewController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await startCandidateInterview(getUserId(req), interviewId);

  return res.status(200).json({
    success: true,

    message: "Interview started successfully",

    data: result,
  });
};

export const getCurrentQuestionController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await getCandidateCurrentQuestion(getUserId(req), interviewId);

  return res.status(200).json({
    success: true,

    data: result,
  });
};

export const submitInterviewAnswerController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await submitCandidateInterviewAnswer(
    getUserId(req),

    interviewId,

    req.body as SubmitInterviewAnswerInput,
  );

  return res.status(200).json({
    success: true,

    message: "Answer submitted successfully",

    data: result,
  });
};

export const completeInterviewController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const interview = await completeCandidateInterview(
    getUserId(req),
    interviewId,
  );

  return res.status(200).json({
    success: true,

    message: "Interview completed successfully",

    data: {
      interview,
    },
  });
};

export const getCandidateInterviewResultController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await getCandidateInterviewResult(getUserId(req), interviewId);

  return res.status(200).json({
    success: true,

    data: {
      result,
    },
  });
};
