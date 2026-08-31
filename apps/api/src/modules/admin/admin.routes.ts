import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/authorize.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getAdminDashboardSummaryController } from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorizeRoles("ORGANIZATION_ADMIN", "SUPER_ADMIN"));

adminRouter.get("/summary", asyncHandler(getAdminDashboardSummaryController));
