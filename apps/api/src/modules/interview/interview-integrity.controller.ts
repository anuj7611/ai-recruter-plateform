import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import {
  getInterviewIntegrityReport,
  recordIntegrityEvents,
  updateInterviewHeartbeat,
} from "./interview-integrity.service.js";
import type { InterviewParams } from "./interview.validation.js";
import type { IntegrityEventInput } from "./interview-integrity.validation.js";

const getUserId = (req: Request) => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
    );
  }

  return userId;
};

export const recordIntegrityEventsController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await recordIntegrityEvents(
    getUserId(req),

    interviewId,

    req.body.events as IntegrityEventInput[],
  );

  return res.status(200).json({
    success: true,

    data: result,
  });
};

export const interviewHeartbeatController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await updateInterviewHeartbeat(getUserId(req), interviewId);

  return res.status(200).json({
    success: true,

    data: result,
  });
};

export const getInterviewIntegrityReportController = async (
  req: Request,
  res: Response,
) => {
  const { interviewId } = req.params as InterviewParams;

  const result = await getInterviewIntegrityReport(
    getUserId(req),

    interviewId,
  );

  return res.status(200).json({
    success: true,

    data: {
      integrity: result,
    },
  });
};
