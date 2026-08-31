import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createInterviewController,
  generateInterviewQuestionsController,
  getInterviewController,
  getInterviewsController,
} from "./interview.controller.js";
import {
  createInterviewSchema,
  interviewParamsSchema,
} from "./interview.validation.js";
import {
  revokeInterviewInvitationController,
  sendInterviewInvitationController,
} from "./interview-invitation.controller.js";
import { sendInterviewInvitationSchema } from "./interview-invitation.validation.js";
import { getInterviewIntegrityReportController } from "./interview-integrity.controller.js";

export const interviewRouter = Router();

interviewRouter.use(authenticate);

interviewRouter.use(
  authorizeRoles("RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"),
);

// CREATE

interviewRouter.post(
  "/",

  validateBody(createInterviewSchema),

  asyncHandler(createInterviewController),
);

// LIST

interviewRouter.get(
  "/",

  asyncHandler(getInterviewsController),
);

// GENERATE QUESTIONS

interviewRouter.post(
  "/:interviewId/generate-questions",

  validateParams(interviewParamsSchema),

  asyncHandler(generateInterviewQuestionsController),
);

interviewRouter.post(
  "/:interviewId/invitations",

  validateParams(interviewParamsSchema),

  validateBody(sendInterviewInvitationSchema),

  asyncHandler(sendInterviewInvitationController),
);

interviewRouter.delete(
  "/:interviewId/invitations",

  validateParams(interviewParamsSchema),

  asyncHandler(revokeInterviewInvitationController),
);

// DETAILS

interviewRouter.get(
  "/:interviewId",

  validateParams(interviewParamsSchema),

  asyncHandler(getInterviewController),
);

interviewRouter.get(
  "/:interviewId/integrity",

  validateParams(interviewParamsSchema),

  asyncHandler(getInterviewIntegrityReportController),
);
