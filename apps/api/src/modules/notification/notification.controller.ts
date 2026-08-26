import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";

export const getNotificationsController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      type: true,
      status: true,

      subject: true,

      sentAt: true,

      createdAt: true,
    },
  });

  return res.status(200).json({
    success: true,

    data: {
      notifications,
    },
  });
};
