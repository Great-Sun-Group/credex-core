import express from "express";
import { CreateCredexService } from "../services/CreateCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../constants/credspan";
import { AuthForTierSpendLimitController } from "../../Member/controllers/authForTierSpendLimit";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateDenomination,
  validateAmount,
  validateCredexType,
} from "../../../utils/validators";

/**
 * CreateCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, performs additional validations,
 * calls the CreateCredexService, and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function CreateCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("CreateCredexController called", { body: req.body, requestId });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
    } = req.body;

    logger.debug("Received request body", {
      fullBody: req.body,
      OFFERSorREQUESTS: OFFERSorREQUESTS,
      requestId,
    });

    logger.debug("Validating input parameters", {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      requestId,
    });

    // Validate input
    if (!validateUUID(memberID)) {
      logger.warn("Invalid memberID provided", { memberID, requestId });
      return res.status(400).json({ error: "Invalid memberID" });
    }
    if (!validateUUID(issuerAccountID)) {
      logger.warn("Invalid issuerAccountID provided", {
        issuerAccountID,
        requestId,
      });
      return res.status(400).json({ error: "Invalid issuerAccountID" });
    }
    if (!validateUUID(receiverAccountID)) {
      logger.warn("Invalid receiverAccountID provided", {
        receiverAccountID,
        requestId,
      });
      return res.status(400).json({ error: "Invalid receiverAccountID" });
    }
    if (!validateDenomination(Denomination)) {
      logger.warn("Invalid Denomination provided", { Denomination, requestId });
      return res.status(400).json({ error: "Invalid Denomination" });
    }
    if (!validateAmount(InitialAmount)) {
      logger.warn("Invalid InitialAmount provided", {
        InitialAmount,
        requestId,
      });
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }
    if (!validateCredexType(credexType)) {
      logger.warn("Invalid credexType provided", { credexType, requestId });
      return res.status(400).json({ error: "Invalid credexType" });
    }
    if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
      logger.warn("Invalid OFFERSorREQUESTS value provided", {
        OFFERSorREQUESTS,
        requestId,
      });
      return res.status(400).json({ error: "Invalid OFFERSorREQUESTS value" });
    }
    if (typeof securedCredex !== "boolean") {
      logger.warn("Invalid securedCredex value provided", {
        securedCredex,
        requestId,
      });
      return res.status(400).json({ error: "Invalid securedCredex value" });
    }
    if (!securedCredex && !dueDate) {
      logger.warn("dueDate is required for unsecured credex", {
        securedCredex,
        dueDate,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "dueDate is required for unsecured credex" });
    }
    if (securedCredex && dueDate) {
      logger.warn("dueDate is not allowed for secured credex", {
        securedCredex,
        dueDate,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "dueDate is not allowed for secured credex" });
    }

    // Check if issuerAccountID and receiverAccountID are the same
    if (issuerAccountID === receiverAccountID) {
      logger.warn("Issuer and receiver are the same account", {
        issuerAccountID,
        receiverAccountID,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "Issuer and receiver cannot be the same account" });
    }

    // Check if credex is authorized based on membership tier
    if (securedCredex) {
      logger.debug("Checking memberTier credex limits", {
        issuerAccountID,
        requestId,
      });
      const tierAuth = await AuthForTierSpendLimitController(
        issuerAccountID,
        InitialAmount,
        Denomination,
        securedCredex,
        requestId
      );
      if (!tierAuth.isAuthorized) {
        logger.warn(tierAuth.message, {
          issuerAccountID,
          InitialAmount,
          Denomination,
          requestId,
        });
        return res.status(400).json({ error: tierAuth.message });
      }
    }

    // Check due date for unsecured credex
    if (!securedCredex) {
      logger.debug("Checking due date for unsecured credex", {
        dueDate,
        requestId,
      });
      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logger.warn("Invalid due date", { dueDate, requestId });
        return res.status(400).json({
          error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`,
        });
      }
    }

    // Call CreateCredexService to create the Credex offer
    logger.debug("Calling CreateCredexService", { body: req.body, requestId });
    const createCredexData = await CreateCredexService(req.body);

    if (!createCredexData || typeof createCredexData.credex === "boolean") {
      logger.warn("Failed to create Credex offer", {
        createCredexData,
        requestId,
      });
      return res.status(400).json({
        error: createCredexData.message || "Failed to create Credex offer",
      });
    }

    // Fetch updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      memberID,
      issuerAccountID,
      requestId,
    });
    const dashboardData = await GetAccountDashboardService(
      memberID,
      issuerAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        memberID,
        issuerAccountID,
        requestId,
      });
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    // Log successful Credex offer
    logger.info("Credex offer created successfully", {
      credexID: createCredexData.credex.credexID,
      memberID,
      issuerAccountID,
      receiverAccountID,
      requestId,
    });

    // Return the offer data and updated dashboard data
    return res.status(200).json({
      createCredexData: createCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Unhandled error in CreateCredexController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    logger.debug("Closing database session", { requestId });
    await ledgerSpaceSession.close();
  }
}
