import express from "express";
import { GetAccountByHandleService } from "../services/GetAccountByHandle";
import logger from "../../../utils/logger";
import { validateAccountHandle } from "../../../utils/validators";

export const GetAccountByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { accountHandle } = req.body;

  logger.debug("Entering GetAccountByHandleController", {
    accountHandle,
    requestId,
  });

  try {
    if (!validateAccountHandle(accountHandle)) {
      logger.warn("Invalid account handle", { accountHandle, requestId });
      res.status(400).json({
        message:
          "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
      });
      logger.debug(
        "Exiting GetAccountByHandleController with invalid account handle",
        { requestId }
      );
      return;
    }

    logger.info("Retrieving account by handle", { accountHandle, requestId });

    const accountData = await GetAccountByHandleService(accountHandle);

    if (accountData) {
      logger.info("Account retrieved successfully", {
        accountHandle,
        accountID: accountData.accountID,
        requestId,
      });
      res.status(200).json({ accountData });
    } else {
      logger.warn("Account not found", { accountHandle, requestId });
      res.status(404).json({ message: "Account not found" });
    }

    logger.debug("Exiting GetAccountByHandleController successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in GetAccountByHandleController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountHandle,
      requestId,
    });
    logger.debug("Exiting GetAccountByHandleController with error", {
      requestId,
    });
    next(error);
  }
};
