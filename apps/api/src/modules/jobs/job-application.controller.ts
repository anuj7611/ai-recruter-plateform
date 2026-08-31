import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import {
  applyToJob,
  createInterviewForApplication,
  getCandidateApplications,
  getCandidateJob,
  getCandidateJobs,
  getRecruiterApplication,
  getRecruiterApplications,
  updateJobApplicationStatus,
} from "./job-application.service.js";
import type {
  ApplyToJobInput,
  CandidateJobParams,
  CreateApplicationInterviewInput,
  JobApplicationParams,
  UpdateJobApplicationStatusInput,
} from "./job-application.validation.js";

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

export const getCandidateJobsController = async (
  req: Request,
  res: Response,
) => {
  const jobs = await getCandidateJobs(getUserId(req));
  return res.status(200).json({ success: true, data: { jobs } });
};

export const getCandidateJobController = async (
  req: Request,
  res: Response,
) => {
  const { jobId } = req.params as CandidateJobParams;
  const job = await getCandidateJob(getUserId(req), jobId);
  return res.status(200).json({ success: true, data: { job } });
};

export const applyToJobController = async (req: Request, res: Response) => {
  const { jobId } = req.params as CandidateJobParams;
  const application = await applyToJob(
    getUserId(req),
    jobId,
    req.body as ApplyToJobInput,
  );

  return res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: { application },
  });
};

export const getCandidateApplicationsController = async (
  req: Request,
  res: Response,
) => {
  const applications = await getCandidateApplications(getUserId(req));
  return res.status(200).json({ success: true, data: { applications } });
};

export const getRecruiterApplicationsController = async (
  req: Request,
  res: Response,
) => {
  const applications = await getRecruiterApplications(getUserId(req));
  return res.status(200).json({ success: true, data: { applications } });
};

export const getRecruiterApplicationController = async (
  req: Request,
  res: Response,
) => {
  const { applicationId } = req.params as JobApplicationParams;
  const application = await getRecruiterApplication(
    getUserId(req),
    applicationId,
  );
  return res.status(200).json({ success: true, data: { application } });
};

export const updateJobApplicationStatusController = async (
  req: Request,
  res: Response,
) => {
  const { applicationId } = req.params as JobApplicationParams;
  const application = await updateJobApplicationStatus(
    getUserId(req),
    applicationId,
    req.body as UpdateJobApplicationStatusInput,
  );

  return res.status(200).json({
    success: true,
    message: "Application status updated successfully",
    data: { application },
  });
};

export const createApplicationInterviewController = async (
  req: Request,
  res: Response,
) => {
  const { applicationId } = req.params as JobApplicationParams;
  const interview = await createInterviewForApplication(
    getUserId(req),
    applicationId,
    req.body as CreateApplicationInterviewInput,
  );

  return res.status(201).json({
    success: true,
    message: "Interview created from application",
    data: { interview },
  });
};

