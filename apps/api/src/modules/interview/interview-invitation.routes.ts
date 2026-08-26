import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import { validateParams } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  acceptInterviewInvitationController,
  getInterviewInvitationController,
} from "./interview-invitation.controller.js";
import { invitationTokenParamsSchema } from "./interview-invitation.validation.js";

export const interviewInvitationRouter = Router();

// Public preview
interviewInvitationRouter.get(
  "/:token",

  validateParams(invitationTokenParamsSchema),

  asyncHandler(getInterviewInvitationController),
);

// Candidate accepts
interviewInvitationRouter.post(
  "/:token/accept",

  authenticate,

  authorizeRoles("CANDIDATE"),

  validateParams(invitationTokenParamsSchema),

  asyncHandler(acceptInterviewInvitationController),
);
