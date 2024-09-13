import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

export async function DeclineRecurringController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("DeclineRecurringController called", { requestId });

  try {
    const { signerID, cancelerAccountID, avatarID } = req.body;

    logger.debug("Validating input parameters", {
      requestId,
      signerID,
      cancelerAccountID,
      avatarID,
    });

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID", { requestId, signerID });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    if (!validateUUID(cancelerAccountID)) {
      logger.warn("Invalid cancelerAccountID", {
        requestId,
        cancelerAccountID,
      });
      return res.status(400).json({ error: "Invalid cancelerAccountID" });
    }

    if (!validateUUID(avatarID)) {
      logger.warn("Invalid avatarID", { requestId, avatarID });
      return res.status(400).json({ error: "Invalid avatarID" });
    }

    logger.info("Calling CancelRecurringService", {
      requestId,
      signerID,
      cancelerAccountID,
      avatarID,
    });
    const cancelRecurringData = await CancelRecurringService(
      signerID,
      cancelerAccountID,
      avatarID,
      requestId
    );

    if (!cancelRecurringData) {
      logger.error("Failed to cancel recurring payment", {
        error: "CancelRecurringService returned null",
        requestId,
        signerID,
        cancelerAccountID,
        avatarID,
      });
      return res
        .status(400)
        .json({ error: "Failed to cancel recurring payment" });
    }

    logger.info("Calling GetAccountDashboardService", {
      requestId,
      signerID,
      cancelerAccountID,
    });
    const dashboardData = await GetAccountDashboardService(
      signerID,
      cancelerAccountID
    );

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", {
        error: "GetAccountDashboardService returned null",
        requestId,
        signerID,
        cancelerAccountID,
      });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment cancelled successfully", {
      avatarID,
      signerID,
      cancelerAccountID,
      requestId,
    });
    return res.status(200).json({
      cancelRecurringData: cancelRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in DeclineRecurringController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
