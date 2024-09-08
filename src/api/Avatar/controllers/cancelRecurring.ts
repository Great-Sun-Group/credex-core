import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { cancelRecurringSchema } from "../validators/avatarSchemas";

export async function DeclineRecurringController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { error, value } = cancelRecurringSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({ error: error.details.map(detail => detail.message) });
    }

    const { signerID, cancelerAccountID, avatarID } = value;

    const cancelRecurringData = await CancelRecurringService(
      signerID,
      cancelerAccountID,
      avatarID
    );

    if (!cancelRecurringData) {
      logger.error("Failed to cancel recurring payment", { error: "CancelRecurringService returned null" });
      return res.status(400).json({ error: "Failed to cancel recurring payment" });
    }

    const dashboardData = await GetAccountDashboardService(signerID, cancelerAccountID);

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment cancelled successfully", { avatarID, signerID, cancelerAccountID });
    return res.status(200).json({
      cancelRecurringData: cancelRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in DeclineRecurringController", { error: (err as Error).message });
    return res.status(500).json({ error: "Internal server error" });
  }
}
