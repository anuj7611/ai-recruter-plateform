import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./lib/prisma.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { ApiError } from "./utils/api-error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import { candidateRouter } from "./modules/candidate/candidate.routes.js";
import { resumeRouter } from "./modules/resume/resume.routes.js";
import { jobRouter } from "./modules/jobs/job.route.js";
import { interviewTemplateRouter } from "./modules/interview-template/interview-template.route.js";
import { interviewRouter } from "./modules/interview/interview.route.js";
import { candidateInterviewRouter } from "./modules/interview/candidate-interview.routes.js";
import { interviewInvitationRouter } from "./modules/interview/interview-invitation.routes.js";
import { notificationRouter } from "./modules/notification/notification.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/v1/health", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();

    return res.status(200).json({
      success: true,
      status: "healthy",
      service: "ai-interview-api",
      database: {
        status: "connected",
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(503).json({
      success: false,
      status: "unhealthy",
      service: "ai-interview-api",
      database: {
        status: "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/candidate", candidateRouter);
app.use("/api/v1/candidate/resume", resumeRouter);
app.use("/api/v1/jobs", jobRouter);
app.use("/api/v1/interview-templates", interviewTemplateRouter);
app.use("/api/v1/interviews", interviewRouter);
app.use("/api/v1/candidate/interviews", candidateInterviewRouter);
app.use("/api/v1/interview-invitations", interviewInvitationRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin", adminRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
