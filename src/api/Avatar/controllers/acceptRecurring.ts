import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * AcceptRecurringController
 *
 * This controller handles the acceptance of recurring transactions.
 * It validates the required fields, calls the AcceptRecurringService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("AcceptRecurringController called", { requestId });

  try {
    const { avatarID, signerID } = req.body;

    logger.debug("Validating input parameters", {
      requestId,
      avatarID,
      signerID,
    });

    if (!validateUUID(avatarID)) {
      logger.warn("Invalid avatarID", { requestId, avatarID });
      return res.status(400).json({ error: "Invalid avatarID" });
    }

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { requestId, signerID });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    logger.info("Calling AcceptRecurringService", {
      requestId,
      avatarID,
      signerID,
    });
    // Call AcceptRecurringService to process the acceptance
    const acceptRecurringData = await AcceptRecurringService({
      avatarID,
      signerID,
      requestId,
    });

    // Check if the service call was successful
    if (typeof acceptRecurringData.recurring === "boolean") {
      logger.error("Failed to accept recurring payment", {
        error: acceptRecurringData.message,
        requestId,
        avatarID,
        signerID,
      });
      return res.status(400).json({ error: acceptRecurringData.message });
    }

    logger.info("Calling GetAccountDashboardService", {
      requestId,
      signerID,
      acceptorAccountID: acceptRecurringData.recurring.acceptorAccountID,
    });
    // Fetch dashboard data
    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptRecurringData.recurring.acceptorAccountID
    );

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", {
        error: "GetAccountDashboardService returned null",
        requestId,
        signerID,
        acceptorAccountID: acceptRecurringData.recurring.acceptorAccountID,
      });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment accepted successfully", {
      avatarID,
      signerID,
      requestId,
      acceptorAccountID: acceptRecurringData.recurring.acceptorAccountID,
    });
    // Return the acceptance data and dashboard data
    return res.status(200).json({
      acceptRecurringData: acceptRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in AcceptRecurringController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
