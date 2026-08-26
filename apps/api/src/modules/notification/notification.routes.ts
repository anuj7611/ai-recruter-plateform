import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getNotificationsController } from "./notification.controller.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get(
  "/",

  asyncHandler(getNotificationsController),
);
