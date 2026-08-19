import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  registerController,
  loginController,
  refreshController,
  logoutAllController,
  logoutController,
  meController,
  resendVerificationController,
  verifyEmailController,
} from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
} from "./auth.validation.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(registerController),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(loginController),
);

authRouter.get("/me", authenticate, asyncHandler(meController));

authRouter.post("/logout", authenticate, asyncHandler(logoutController));

authRouter.post("/logout-all", authenticate, asyncHandler(logoutAllController));

authRouter.post("/refresh", asyncHandler(refreshController));

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncHandler(verifyEmailController),
);

authRouter.post(
  "/resend-verification",
  authenticate,
  asyncHandler(resendVerificationController),
);
