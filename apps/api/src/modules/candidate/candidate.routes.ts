import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  getCandidateProfileController,
  updateCandidateProfileController,
} from "./candidate.controller.js";
import { updateCandidateProfileSchema } from "./candidate.validation.js";

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
