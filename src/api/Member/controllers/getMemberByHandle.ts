import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";
import logger from "../../../../config/logger";
import { validateMemberHandle } from "../../../utils/validators";

export const GetMemberByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const { memberHandle } = req.body;

  try {
    if (!validateMemberHandle(memberHandle)) {
      res.status(400).json({ message: 'Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.' });
      return;
    }

    logger.info("Retrieving member by handle", { memberHandle });

    const memberData = await GetMemberByHandleService(memberHandle);

    if (memberData) {
      logger.info("Member retrieved successfully", { memberHandle });
      res.status(200).json({ memberData });
    } else {
      logger.info("Member not found", { memberHandle });
      res.status(404).json({ message: "Member not found" });
    }
  } catch (error) {
    logger.error("Error in GetMemberByHandleController", { error, memberHandle });
    next(error);
  }
};
