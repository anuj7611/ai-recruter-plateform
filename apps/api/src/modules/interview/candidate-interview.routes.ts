import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";

import { authorizeRoles } from "../../middleware/authorize.middleware.js";

import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";

import { asyncHandler } from "../../utils/async-handler.js";

import {
  completeInterviewController,
  getCandidateInterviewResultController,
  getCandidateInterviewsController,
  getCurrentQuestionController,
  startCandidateInterviewController,
  submitInterviewAnswerController,
} from "./candidate-interview.controller.js";

import {
  interviewParamsSchema,
  submitInterviewAnswerSchema,
} from "./interview.validation.js";

export const candidateInterviewRouter = Router();

candidateInterviewRouter.use(authenticate);

candidateInterviewRouter.use(authorizeRoles("CANDIDATE"));

// LIST

candidateInterviewRouter.get(
  "/",

  asyncHandler(getCandidateInterviewsController),
);

// START

candidateInterviewRouter.post(
  "/:interviewId/start",

  validateParams(interviewParamsSchema),

  asyncHandler(startCandidateInterviewController),
);

// CURRENT QUESTION

candidateInterviewRouter.get(
  "/:interviewId/current-question",

  validateParams(interviewParamsSchema),

  asyncHandler(getCurrentQuestionController),
);

// SUBMIT ANSWER

candidateInterviewRouter.post(
  "/:interviewId/answer",

  validateParams(interviewParamsSchema),

  validateBody(submitInterviewAnswerSchema),

  asyncHandler(submitInterviewAnswerController),
);

// COMPLETE

candidateInterviewRouter.post(
  "/:interviewId/complete",

  validateParams(interviewParamsSchema),

  asyncHandler(completeInterviewController),
);

// RESULT

candidateInterviewRouter.get(
  "/:interviewId/result",

  validateParams(interviewParamsSchema),

  asyncHandler(getCandidateInterviewResultController),
);
