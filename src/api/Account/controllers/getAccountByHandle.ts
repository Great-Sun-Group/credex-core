import express from "express";
import { GetAccountByHandleService } from "../services/GetAccountByHandle";
import logger from "../../../utils/logger";
import { validateAccountHandle } from "../../../utils/validators";

/**
 * Controller for retrieving an account by its handle
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetAccountByHandleController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logger.debug("GetAccountByHandleController called", { query: req.query });

  const { accountHandle } = req.query;

  try {
    if (!validateAccountHandle(accountHandle as string)) {
      logger.warn("Invalid account handle provided", { accountHandle });
      res.status(400).json({ message: "Invalid account handle" });
      return;
    }

    logger.info("Retrieving account by handle", { accountHandle });

    const accountData = await GetAccountByHandleService(
      accountHandle as string
    );

    if (accountData) {
      logger.info("Account retrieved successfully", {
        accountHandle,
        accountID: accountData.accountID,
      });
      res.status(200).json({ accountData });
    } else {
      logger.info("Account not found", { accountHandle });
      res.status(404).json({ message: "Account not found" });
    }
  } catch (error) {
    logger.error("Error in GetAccountByHandleController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountHandle,
    });
    next(error);
  }
}
