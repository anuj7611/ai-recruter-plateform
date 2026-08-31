import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  getCandidateProfileController,
  updateCandidateProfileController,
} from "./candidate.controller.js";
import { updateCandidateProfileSchema } from "./candidate.validation.js";
import {
  applyToJobController,
  getCandidateApplicationsController,
  getCandidateJobController,
  getCandidateJobsController,
} from "../jobs/job-application.controller.js";
import {
  applyToJobSchema,
  candidateJobParamsSchema,
} from "../jobs/job-application.validation.js";

export const candidateRouter = Router();

candidateRouter.use(authenticate);

candidateRouter.use(authorizeRoles("CANDIDATE"));

// ======================================
// PROFILE
// ======================================

candidateRouter.get("/profile", asyncHandler(getCandidateProfileController));

candidateRouter.patch(
  "/profile",
  validateBody(updateCandidateProfileSchema),
  asyncHandler(updateCandidateProfileController),
);

candidateRouter.get("/jobs", asyncHandler(getCandidateJobsController));

candidateRouter.get(
  "/jobs/:jobId",
  validateParams(candidateJobParamsSchema),
  asyncHandler(getCandidateJobController),
);

candidateRouter.post(
  "/jobs/:jobId/apply",
  validateParams(candidateJobParamsSchema),
  validateBody(applyToJobSchema),
  asyncHandler(applyToJobController),
);

candidateRouter.get(
  "/applications",
  asyncHandler(getCandidateApplicationsController),
);
