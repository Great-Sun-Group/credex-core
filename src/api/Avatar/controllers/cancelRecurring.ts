import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { validateUUID } from "../../../utils/validators";

export async function DeclineRecurringController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;

  try {
    const { signerID, cancelerAccountID, avatarID } = req.body;

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    if (!validateUUID(cancelerAccountID)) {
      logger.warn("Invalid cancelerAccountID", { requestId });
      return res.status(400).json({ error: "Invalid cancelerAccountID" });
    }

    if (!validateUUID(avatarID)) {
      logger.warn("Invalid avatarID", { requestId });
      return res.status(400).json({ error: "Invalid avatarID" });
    }

    const cancelRecurringData = await CancelRecurringService(
      signerID,
      cancelerAccountID,
      avatarID,
      requestId
    );

    if (!cancelRecurringData) {
      logger.error("Failed to cancel recurring payment", { error: "CancelRecurringService returned null", requestId });
      return res.status(400).json({ error: "Failed to cancel recurring payment" });
    }

    const dashboardData = await GetAccountDashboardService(signerID, cancelerAccountID);

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null", requestId });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment cancelled successfully", { avatarID, signerID, cancelerAccountID, requestId });
    return res.status(200).json({
      cancelRecurringData: cancelRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in DeclineRecurringController", { error: (err as Error).message, requestId });
    return res.status(500).json({ error: "Internal server error" });
  }
}
