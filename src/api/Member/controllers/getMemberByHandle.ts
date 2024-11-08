import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";
import logger from "../../../utils/logger";
import { validateHandle } from "../../../utils/validators";

export const GetMemberByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { memberHandle } = req.body;

  logger.debug("Entering GetMemberByHandleController", {
    memberHandle,
    requestId,
  });

  try {
    if (!validateHandle(memberHandle).isValid) {
      logger.warn("Invalid member handle", { memberHandle, requestId });
      res
        .status(400)
        .json({
          message:
            "Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
        });
      logger.debug(
        "Exiting GetMemberByHandleController with invalid member handle",
        { requestId }
      );
      return;
    }

    logger.info("Retrieving member by handle", { memberHandle, requestId });

    const memberData = await GetMemberByHandleService(memberHandle);

    if (memberData) {
      logger.info("Member retrieved successfully", {
        memberHandle,
        memberID: memberData.memberID,
        requestId,
      });
      res.status(200).json({ memberData });
    } else {
      logger.info("Member not found", { memberHandle, requestId });
      res.status(404).json({ message: "Member not found" });
    }

    logger.debug("Exiting GetMemberByHandleController successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in GetMemberByHandleController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberHandle,
      requestId,
    });
    logger.debug("Exiting GetMemberByHandleController with error", {
      requestId,
    });
    next(error);
  }
};
