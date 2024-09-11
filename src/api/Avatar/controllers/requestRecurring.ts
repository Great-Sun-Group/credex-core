import express from "express";
import { RequestRecurringService } from "../services/RequestRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateAmount,
  validateDenomination,
  validatePositiveInteger,
} from "../../../utils/validators";

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
  logger.debug("RequestRecurringController called", { requestId: req.id });

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
      remainingPays,
    } = req.body;

    logger.debug("Validating input parameters", {
      signerMemberID,
      requestorAccountID,
      counterpartyAccountID,
      InitialAmount,
      Denomination,
      nextPayDate,
      daysBetweenPays,
      securedCredex,
      credspan,
      remainingPays,
    });

    if (!validateUUID(signerMemberID)) {
      logger.warn("Invalid signerMemberID", { signerMemberID });
      return res.status(400).json({ error: "Invalid signerMemberID" });
    }
    if (!validateUUID(requestorAccountID)) {
      logger.warn("Invalid requestorAccountID", { requestorAccountID });
      return res.status(400).json({ error: "Invalid requestorAccountID" });
    }
    if (!validateUUID(counterpartyAccountID)) {
      logger.warn("Invalid counterpartyAccountID", { counterpartyAccountID });
      return res.status(400).json({ error: "Invalid counterpartyAccountID" });
    }
    if (!validateAmount(InitialAmount)) {
      logger.warn("Invalid InitialAmount", { InitialAmount });
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }
    if (!validateDenomination(Denomination)) {
      logger.warn("Invalid Denomination", { Denomination });
      return res.status(400).json({ error: "Invalid Denomination" });
    }
    if (isNaN(Date.parse(nextPayDate))) {
      logger.warn("Invalid nextPayDate", { nextPayDate });
      return res.status(400).json({ error: "Invalid nextPayDate" });
    }
    if (!validatePositiveInteger(daysBetweenPays)) {
      logger.warn("Invalid daysBetweenPays", { daysBetweenPays });
      return res.status(400).json({ error: "Invalid daysBetweenPays" });
    }
    if (securedCredex === true && credspan !== undefined) {
      logger.warn("credspan is not allowed when securedCredex is true", {
        securedCredex,
        credspan,
      });
      return res
        .status(400)
        .json({ error: "credspan is not allowed when securedCredex is true" });
    }
    if (
      securedCredex === false &&
      (credspan === undefined || credspan < 7 || credspan > 35)
    ) {
      logger.warn("Invalid credspan for non-secured Credex", {
        securedCredex,
        credspan,
      });
      return res
        .status(400)
        .json({
          error:
            "credspan must be between 7 and 35 when securedCredex is false",
        });
    }
    if (
      remainingPays !== undefined &&
      !validatePositiveInteger(remainingPays)
    ) {
      logger.warn("Invalid remainingPays", { remainingPays });
      return res.status(400).json({ error: "Invalid remainingPays" });
    }

    logger.info("Calling RequestRecurringService");
    const createRecurringData = await RequestRecurringService(req.body);

    if (!createRecurringData) {
      logger.error("Failed to create recurring payment", {
        error: "RequestRecurringService returned null",
      });
      return res
        .status(500)
        .json({ error: "Failed to create recurring payment" });
    }

    logger.info("Calling GetAccountDashboardService");
    const dashboardData = await GetAccountDashboardService(
      signerMemberID,
      requestorAccountID
    );

    if (!dashboardData) {
      logger.error("Failed to fetch dashboard data", {
        error: "GetAccountDashboardService returned null",
      });
      return res.status(500).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Recurring payment requested successfully", {
      avatarMemberID: createRecurringData,
    });
    return res.status(200).json({
      avatarMemberID: createRecurringData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Error in RequestRecurringController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
