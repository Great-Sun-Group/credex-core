import express from "express";
import { GetAccountByHandleService } from "../services/GetAccountByHandle";
import logger from "../../../config/logger";

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
  const { accountHandle } = req.body;

  try {
    if (!accountHandle || typeof accountHandle !== 'string') {
      res.status(400).json({ message: "accountHandle is required and must be a string" });
      return;
    }

    // Validate accountHandle format
    if (!/^[a-z0-9._]{3,30}$/.test(accountHandle)) {
      res.status(400).json({
        message: "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
      });
      return;
    }

    logger.info("Retrieving account by handle", { accountHandle });

    const accountData = await GetAccountByHandleService(accountHandle);

    if (accountData) {
      logger.info("Account retrieved successfully", { accountHandle });
      res.status(200).json({ accountData });
    } else {
      logger.info("Account not found", { accountHandle });
      res.status(404).json({ message: "Account not found" });
    }
  } catch (error) {
    logger.error("Error in GetAccountByHandleController", { error, accountHandle });
    next(error);
  }
}
