import express from "express";
import { RequestRecurringService } from "../services/RequestRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { requestRecurringSchema } from "../validators/avatarSchemas";

/**
 * RequestRecurringController
 * 
 * This controller handles the creation of recurring payment requests.
 * It validates the input, calls the RequestRecurringService,
 * and returns the result along with updated dashboard data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function RequestRecurringController(
  req: express.Request,
  res: express.Response
) {
  try {
    const { error, value } = requestRecurringSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({ error: error.details.map(detail => detail.message) });
    }

    const createRecurringData = await RequestRecurringService(value);

    if (!createRecurringData) {
      logger.error("Failed to create recurring payment", { error: "RequestRecurringService returned null" });
      return res.status(500).json({ error: "Failed to create recurring payment" });
    }

    const dashboardData = await GetAccountDashboardService(value.signerMemberID, value.requestorAccountID);

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null" });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment requested successfully", { avatarMemberID: createRecurringData });
    return res.status(200).json({
      avatarMemberID: createRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in RequestRecurringController", { error: (err as Error).message });
    return res.status(500).json({ error: "Internal server error" });
  }
}
