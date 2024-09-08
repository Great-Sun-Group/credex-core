import express from "express";
import { GetAccountDashboardService } from "../services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { validateUUID } from "../../../utils/validators";

export async function GetAccountDashboardController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { memberID, accountID } = req.body;

  try {
    if (!validateUUID(memberID)) {
      return res.status(400).json({ message: "Invalid memberID" });
    }
    if (!validateUUID(accountID)) {
      return res.status(400).json({ message: "Invalid accountID" });
    }

    logger.info("Getting account dashboard", { memberID, accountID });

    const accountDashboard = await GetAccountDashboardService(memberID, accountID);

    if (!accountDashboard) {
      logger.warn("Account dashboard not found", { memberID, accountID });
      return res.status(404).json({ message: "Account dashboard not found" });
    }

    logger.info("Account dashboard retrieved successfully", { memberID, accountID });
    return res.status(200).json(accountDashboard);
  } catch (error) {
    logger.error("Error in GetAccountDashboardController", { error, memberID, accountID });
    next(error);
  }
}