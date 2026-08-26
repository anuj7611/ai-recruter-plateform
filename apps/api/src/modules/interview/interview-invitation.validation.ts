import { z } from "zod";

export const sendInterviewInvitationSchema = z.object({
  expiresInHours: z.number().int().min(1).max(720).optional(),
});

export const invitationTokenParamsSchema = z.object({
  token: z.string().trim().min(32),
});

export type SendInterviewInvitationInput = z.infer<
  typeof sendInterviewInvitationSchema
>;

export type InvitationTokenParams = z.infer<typeof invitationTokenParamsSchema>;
