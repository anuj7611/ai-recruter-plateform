import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import { getAdminDashboardSummary } from "./admin.service.js";

export const getAdminDashboardSummaryController = async (
  req: Request,
  res: Response,
) => {
  const auth = req.auth;

  if (
    !auth ||
    (auth.role !== "ORGANIZATION_ADMIN" && auth.role !== "SUPER_ADMIN")
  ) {
    throw new ApiError(403, "Administrator access required", "FORBIDDEN");
  }

  const summary = await getAdminDashboardSummary(auth.userId, auth.role);

  return res.status(200).json({
    success: true,
    data: { summary },
  });
};
