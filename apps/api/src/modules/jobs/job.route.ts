import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createJobController,
  deleteJobController,
  getJobController,
  getJobsController,
  updateJobController,
  updateJobStatusController,
} from "./job.controller.js";
import {
  createJobSchema,
  jobParamsSchema,
  updateJobSchema,
  updateJobStatusSchema,
} from "./job.validation.js";
import {
  createApplicationInterviewController,
  getRecruiterApplicationController,
  getRecruiterApplicationsController,
  updateJobApplicationStatusController,
} from "./job-application.controller.js";
import {
  createApplicationInterviewSchema,
  jobApplicationParamsSchema,
  updateJobApplicationStatusSchema,
} from "./job-application.validation.js";

export const jobRouter = Router();

jobRouter.use(authenticate);

jobRouter.use(authorizeRoles("RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"));

jobRouter.post(
  "/",

  validateBody(createJobSchema),

  asyncHandler(createJobController),
);

jobRouter.get(
  "/",

  asyncHandler(getJobsController),
);

jobRouter.get(
  "/applications",
  asyncHandler(getRecruiterApplicationsController),
);

jobRouter.get(
  "/applications/:applicationId",
  validateParams(jobApplicationParamsSchema),
  asyncHandler(getRecruiterApplicationController),
);

jobRouter.patch(
  "/applications/:applicationId/status",
  validateParams(jobApplicationParamsSchema),
  validateBody(updateJobApplicationStatusSchema),
  asyncHandler(updateJobApplicationStatusController),
);

jobRouter.post(
  "/applications/:applicationId/interview",
  validateParams(jobApplicationParamsSchema),
  validateBody(createApplicationInterviewSchema),
  asyncHandler(createApplicationInterviewController),
);

jobRouter.get(
  "/:jobId",

  validateParams(jobParamsSchema),

  asyncHandler(getJobController),
);

jobRouter.patch(
  "/:jobId",

  validateParams(jobParamsSchema),

  validateBody(updateJobSchema),

  asyncHandler(updateJobController),
);

jobRouter.patch(
  "/:jobId/status",

  validateParams(jobParamsSchema),

  validateBody(updateJobStatusSchema),

  asyncHandler(updateJobStatusController),
);

jobRouter.delete(
  "/:jobId",

  validateParams(jobParamsSchema),

  asyncHandler(deleteJobController),
);
