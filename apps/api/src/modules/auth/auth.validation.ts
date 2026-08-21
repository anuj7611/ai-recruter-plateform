import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(80, "Name must contain at most 80 characters"),

  email: z
    .email("Please provide a valid email address")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const loginSchema = z.object({
  email: z
    .email("Please provide a valid email address")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .email("Please provide a valid email address")
    .transform((email) => email.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const sessionParamsSchema = z.object({
  sessionId: z.uuid("Session ID must be a valid UUID"),
});

export const createInvitationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(80, "Name must contain at most 80 characters"),
  email: z
    .email("Please provide a valid email address")
    .transform((email) => email.toLowerCase()),
  role: z.enum(["RECRUITER", "ORGANIZATION_ADMIN", "SUPER_ADMIN"]),
});

export const invitationTokenParamsSchema = z.object({
  token: z.string().min(32, "Invitation token is invalid"),
});

export const acceptInvitationSchema = z.object({
  token: z
    .string({
      error:
        "An invitation token is required for administrator registration",
    })
    .min(32, "Invitation token is invalid"),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
