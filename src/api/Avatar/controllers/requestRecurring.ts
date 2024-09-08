import express from "express";
import { RequestRecurringService } from "../services/RequestRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { validateUUID, validateAmount, validateDenomination, validatePositiveInteger } from "../../../utils/validators";

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
    const { 
      signerMemberID, 
      requestorAccountID, 
      counterpartyAccountID, 
      InitialAmount, 
      Denomination, 
      nextPayDate, 
      daysBetweenPays, 
      securedCredex, 
      credspan, 
      remainingPays 
    } = req.body;

    if (!validateUUID(signerMemberID)) {
      return res.status(400).json({ error: "Invalid signerMemberID" });
    }
    if (!validateUUID(requestorAccountID)) {
      return res.status(400).json({ error: "Invalid requestorAccountID" });
    }
    if (!validateUUID(counterpartyAccountID)) {
      return res.status(400).json({ error: "Invalid counterpartyAccountID" });
    }
    if (!validateAmount(InitialAmount)) {
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }
    if (!validateDenomination(Denomination)) {
      return res.status(400).json({ error: "Invalid Denomination" });
    }
    if (isNaN(Date.parse(nextPayDate))) {
      return res.status(400).json({ error: "Invalid nextPayDate" });
    }
    if (!validatePositiveInteger(daysBetweenPays)) {
      return res.status(400).json({ error: "Invalid daysBetweenPays" });
    }
    if (securedCredex === true && credspan !== undefined) {
      return res.status(400).json({ error: "credspan is not allowed when securedCredex is true" });
    }
    if (securedCredex === false && (credspan === undefined || credspan < 7 || credspan > 35)) {
      return res.status(400).json({ error: "credspan must be between 7 and 35 when securedCredex is false" });
    }
    if (remainingPays !== undefined && !validatePositiveInteger(remainingPays)) {
      return res.status(400).json({ error: "Invalid remainingPays" });
    }

    const createRecurringData = await RequestRecurringService(req.body);

    if (!createRecurringData) {
      logger.error("Failed to create recurring payment", { error: "RequestRecurringService returned null" });
      return res.status(500).json({ error: "Failed to create recurring payment" });
    }

    const dashboardData = await GetAccountDashboardService(signerMemberID, requestorAccountID);

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
