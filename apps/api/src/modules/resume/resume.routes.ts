import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  deleteResumeController,
  getResumeByIdController,
  getResumesController,
  setPrimaryResumeController,
  uploadResumeController,
  parseResumeController,
  analyzeResumeController,
  chunkResumeController,
} from "./resume.controller.js";
import { resumeUpload } from "./resume.upload.js";
import { createResumeSchema, resumeParamsSchema } from "./resume.validation.js";

export const resumeRouter = Router();

resumeRouter.use(authenticate);

resumeRouter.use(authorizeRoles("CANDIDATE"));

resumeRouter.post(
  "/",
  resumeUpload.single("resume"),
  validateBody(createResumeSchema),
  asyncHandler(uploadResumeController),
);

resumeRouter.get("/", asyncHandler(getResumesController));

resumeRouter.post(
  "/:resumeId/parse",
  validateParams(resumeParamsSchema),
  asyncHandler(parseResumeController),
);

resumeRouter.post(
  "/:resumeId/analyze",

  validateParams(resumeParamsSchema),

  asyncHandler(analyzeResumeController),
);

resumeRouter.post(
  "/:resumeId/chunk",

  validateParams(resumeParamsSchema),

  asyncHandler(chunkResumeController),
);

resumeRouter.get(
  "/:resumeId",
  validateParams(resumeParamsSchema),
  asyncHandler(getResumeByIdController),
);

resumeRouter.patch(
  "/:resumeId/primary",
  validateParams(resumeParamsSchema),
  asyncHandler(setPrimaryResumeController),
);

resumeRouter.delete(
  "/:resumeId",
  validateParams(resumeParamsSchema),
  asyncHandler(deleteResumeController),
);
