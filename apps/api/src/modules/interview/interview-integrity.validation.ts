import { z } from "zod";

export const integrityEventSchema = z.object({
  type: z.enum([
    "TAB_HIDDEN",
    "WINDOW_BLUR",
    "FULLSCREEN_EXIT",
    "COPY",
    "PASTE",
    "CUT",
    "PAGE_REFRESH",
    "DISCONNECT",
    "HEARTBEAT_MISSED",
  ]),

  occurredAt: z.string().datetime().optional(),

  metadata: z.record(z.string(), z.json()).optional(),
});

export const integrityEventsBatchSchema = z.object({
  events: z.array(integrityEventSchema).min(1).max(25),
});

export type IntegrityEventInput = z.infer<typeof integrityEventSchema>;
