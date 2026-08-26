import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import {
  createInterviewTemplate,
  deleteInterviewTemplate,
  getInterviewTemplateById,
  getInterviewTemplates,
  setInterviewTemplateActive,
  updateInterviewTemplate,
} from "./interview-template.service.js";
import type {
  CreateInterviewTemplateInput,
  InterviewTemplateParams,
  UpdateInterviewTemplateActiveInput,
  UpdateInterviewTemplateInput,
} from "./interview-template.validation.js";

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

export const createInterviewTemplateController = async (
  req: Request,
  res: Response,
) => {
  const template = await createInterviewTemplate(
    getUserId(req),

    req.body as CreateInterviewTemplateInput,
  );

  return res.status(201).json({
    success: true,

    message: "Interview template created successfully",

    data: {
      template,
    },
  });
};

export const getInterviewTemplatesController = async (
  req: Request,
  res: Response,
) => {
  const templates = await getInterviewTemplates(getUserId(req));

  return res.status(200).json({
    success: true,

    data: {
      templates,
    },
  });
};

export const getInterviewTemplateController = async (
  req: Request,
  res: Response,
) => {
  const { templateId } = req.params as InterviewTemplateParams;

  const template = await getInterviewTemplateById(getUserId(req), templateId);

  return res.status(200).json({
    success: true,

    data: {
      template,
    },
  });
};

export const updateInterviewTemplateController = async (
  req: Request,
  res: Response,
) => {
  const { templateId } = req.params as InterviewTemplateParams;

  const template = await updateInterviewTemplate(
    getUserId(req),

    templateId,

    req.body as UpdateInterviewTemplateInput,
  );

  return res.status(200).json({
    success: true,

    message: "Interview template updated successfully",

    data: {
      template,
    },
  });
};

export const setInterviewTemplateActiveController = async (
  req: Request,
  res: Response,
) => {
  const { templateId } = req.params as InterviewTemplateParams;

  const { isActive } = req.body as UpdateInterviewTemplateActiveInput;

  const template = await setInterviewTemplateActive(
    getUserId(req),

    templateId,

    isActive,
  );

  return res.status(200).json({
    success: true,

    message: "Interview template status updated successfully",

    data: {
      template,
    },
  });
};

export const deleteInterviewTemplateController = async (
  req: Request,
  res: Response,
) => {
  const { templateId } = req.params as InterviewTemplateParams;

  await deleteInterviewTemplate(getUserId(req), templateId);

  return res.status(200).json({
    success: true,

    message: "Interview template deleted successfully",
  });
};
