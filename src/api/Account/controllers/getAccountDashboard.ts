import express from "express";
import { GetAccountDashboardService } from "../services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { validateUUID } from "../../../utils/validators";

export async function GetAccountDashboardController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { memberID, accountID } = req.body;

  logger.debug('GetAccountDashboardController entered', { requestId, memberID, accountID });

  try {
    if (!validateUUID(memberID)) {
      logger.warn('Invalid memberID', { requestId, memberID });
      return res.status(400).json({ message: "Invalid memberID" });
    }
    if (!validateUUID(accountID)) {
      logger.warn('Invalid accountID', { requestId, accountID });
      return res.status(400).json({ message: "Invalid accountID" });
    }

    logger.info("Getting account dashboard", { requestId, memberID, accountID });

    const accountDashboard = await GetAccountDashboardService(memberID, accountID);

    if (!accountDashboard) {
      logger.warn("Account dashboard not found", { requestId, memberID, accountID });
      return res.status(404).json({ message: "Account dashboard not found" });
    }

    logger.info("Account dashboard retrieved successfully", { requestId, memberID, accountID });
    logger.debug('GetAccountDashboardController exiting successfully', { requestId });
    return res.status(200).json(accountDashboard);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error in GetAccountDashboardController", { 
        requestId, 
        memberID, 
        accountID, 
        error: error.message, 
        stack: error.stack 
      });
    } else {
      logger.error("Unknown error in GetAccountDashboardController", { 
        requestId, 
        memberID, 
        accountID, 
        error: String(error)
      });
    }
    logger.debug('GetAccountDashboardController exiting with error', { requestId });
    next(error);
  }
}