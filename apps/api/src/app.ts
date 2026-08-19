import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./lib/prisma.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { ApiError } from "./utils/api-error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: "http://localhost:3000",
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

app.use(notFoundMiddleware);
app.use(errorMiddleware);
