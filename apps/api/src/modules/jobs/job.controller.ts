import type { Request, Response } from "express";

import { ApiError } from "../../utils/api-error.js";

import {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  updateJob,
  updateJobStatus,
} from "./job.service.js";

import type {
  CreateJobInput,
  JobParams,
  UpdateJobInput,
  UpdateJobStatusInput,
} from "./job.validation.js";

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

export const createJobController = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const job = await createJob(userId, req.body as CreateJobInput);

  return res.status(201).json({
    success: true,
    message: "Job created successfully",

    data: {
      job,
    },
  });
};

export const getJobsController = async (req: Request, res: Response) => {
  const jobs = await getJobs(getUserId(req));

  return res.status(200).json({
    success: true,

    data: {
      jobs,
    },
  });
};

export const getJobController = async (req: Request, res: Response) => {
  const { jobId } = req.params as JobParams;

  const job = await getJobById(getUserId(req), jobId);

  return res.status(200).json({
    success: true,

    data: {
      job,
    },
  });
};

export const updateJobController = async (req: Request, res: Response) => {
  const { jobId } = req.params as JobParams;

  const job = await updateJob(
    getUserId(req),

    jobId,

    req.body as UpdateJobInput,
  );

  return res.status(200).json({
    success: true,
    message: "Job updated successfully",

    data: {
      job,
    },
  });
};

export const updateJobStatusController = async (
  req: Request,
  res: Response,
) => {
  const { jobId } = req.params as JobParams;

  const { status } = req.body as UpdateJobStatusInput;

  const job = await updateJobStatus(getUserId(req), jobId, status);

  return res.status(200).json({
    success: true,

    message: "Job status updated successfully",

    data: {
      job,
    },
  });
};

export const deleteJobController = async (req: Request, res: Response) => {
  const { jobId } = req.params as JobParams;

  await deleteJob(getUserId(req), jobId);

  return res.status(200).json({
    success: true,

    message: "Job deleted successfully",
  });
};
