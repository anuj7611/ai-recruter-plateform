import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { createRateLimiter } from "../../middleware/rate-limit.middleware.js";
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
  forgotPasswordController,
  resetPasswordController,
  sessionsController,
  revokeSessionController,
  oauthStartController,
  oauthCallbackController,
} from "./auth.controller.js";
import {
  forgotPasswordSchema,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  sessionParamsSchema,
  verifyEmailSchema,
} from "./auth.validation.js";

export const authRouter = Router();

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Too many authentication requests. Try again later.",
});

const registrationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: "REGISTRATION_RATE_LIMIT_EXCEEDED",
  message: "Too many registration attempts. Try again later.",
});

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: "LOGIN_RATE_LIMIT_EXCEEDED",
  message: "Too many login attempts. Try again later.",
  keyGenerator: (req) =>
    `${req.ip ?? "unknown"}:${String(req.body?.email ?? "").toLowerCase()}`,
});

const emailActionRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: "EMAIL_RATE_LIMIT_EXCEEDED",
  message: "Too many email requests. Try again later.",
});

authRouter.use(authRateLimit);

authRouter.post(
  "/register",
  registrationRateLimit,
  validateBody(registerSchema),
  asyncHandler(registerController),
);

authRouter.post(
  "/login",
  loginRateLimit,
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
  emailActionRateLimit,
  authenticate,
  asyncHandler(resendVerificationController),
);

authRouter.post(
  "/forgot-password",
  emailActionRateLimit,
  validateBody(forgotPasswordSchema),
  asyncHandler(forgotPasswordController),
);

authRouter.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  asyncHandler(resetPasswordController),
);

authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));

authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  validateParams(sessionParamsSchema),
  asyncHandler(revokeSessionController),
);

authRouter.get("/oauth/:provider", asyncHandler(oauthStartController));

authRouter.get(
  "/oauth/:provider/callback",
  asyncHandler(oauthCallbackController),
);
