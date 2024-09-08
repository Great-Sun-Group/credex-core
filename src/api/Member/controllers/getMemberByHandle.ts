import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";
import logger from "../../../../config/logger";
import { getMemberByHandleSchema } from "../validators/memberSchemas";

export const GetMemberByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const { memberHandle } = req.body;

  try {
    const { error } = getMemberByHandleSchema.validate({ memberHandle });
    if (error) {
      res.status(400).json({ message: error.details[0].message });
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
