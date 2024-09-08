import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
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

  try {
    const { avatarID, signerID } = req.body;

    if (!validateUUID(avatarID)) {
      logger.warn("Invalid avatarID", { requestId });
      return res.status(400).json({ error: "Invalid avatarID" });
    }

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

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
      });
      return res.status(400).json({ error: acceptRecurringData.message });
    }

    // Fetch dashboard data
    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptRecurringData.recurring.acceptorAccountID
    );

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", {
        error: "GetAccountDashboardService returned null",
        requestId,
      });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment accepted successfully", {
      avatarID,
      signerID,
      requestId,
    });
    // Return the acceptance data and dashboard data
    return res.status(200).json({
      acceptRecurringData: acceptRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in AcceptRecurringController", {
      error: (err as Error).message,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
