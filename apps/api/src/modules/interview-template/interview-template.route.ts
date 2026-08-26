import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createInterviewTemplateController,
  deleteInterviewTemplateController,
  getInterviewTemplateController,
  getInterviewTemplatesController,
  setInterviewTemplateActiveController,
  updateInterviewTemplateController,
} from "./interview-template.controller.js";
import {
  createInterviewTemplateSchema,
  interviewTemplateParamsSchema,
  updateInterviewTemplateActiveSchema,
  updateInterviewTemplateSchema,
} from "./interview-template.validation.js";

export const interviewTemplateRouter = Router();

interviewTemplateRouter.use(authenticate);

interviewTemplateRouter.use(
  authorizeRoles("RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"),
);

interviewTemplateRouter.post(
  "/",

  validateBody(createInterviewTemplateSchema),

  asyncHandler(createInterviewTemplateController),
);

interviewTemplateRouter.get(
  "/",

  asyncHandler(getInterviewTemplatesController),
);

interviewTemplateRouter.get(
  "/:templateId",

  validateParams(interviewTemplateParamsSchema),

  asyncHandler(getInterviewTemplateController),
);

interviewTemplateRouter.patch(
  "/:templateId",

  validateParams(interviewTemplateParamsSchema),

  validateBody(updateInterviewTemplateSchema),

  asyncHandler(updateInterviewTemplateController),
);

interviewTemplateRouter.patch(
  "/:templateId/active",

  validateParams(interviewTemplateParamsSchema),

  validateBody(updateInterviewTemplateActiveSchema),

  asyncHandler(setInterviewTemplateActiveController),
);

interviewTemplateRouter.delete(
  "/:templateId",

  validateParams(interviewTemplateParamsSchema),

  asyncHandler(deleteInterviewTemplateController),
);
