import express from "express";
import { CreateCredexService } from "../services/CreateCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../constants/credspan";
import { AuthForTierSpendLimitService } from "../../Member/services/AuthForTierSpendLimit";
import logger from "../../../utils/logger";

/**
 * CreateCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates business rules, performs authorization checks,
 * and creates the Credex with appropriate relationships.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateCredexController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering CreateCredexController", { 
    requestId,
    body: req.body 
  });

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

    // Basic validation is handled by validateRequest middleware
    logger.debug("Validating business rules", {
      requestId,
      issuerAccountID,
      receiverAccountID,
      securedCredex,
      dueDate
    });

    // Check if issuer and receiver are different
    if (issuerAccountID === receiverAccountID) {
      logger.warn("Attempted to create Credex with same issuer and receiver", {
        issuerAccountID,
        receiverAccountID,
        requestId,
      });
      return res.status(400).json({
        success: false,
        error: "Issuer and receiver cannot be the same account"
      });
    }

    // Check membership tier authorization for secured credex
    if (securedCredex) {
      logger.debug("Checking membership tier authorization", {
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId
      });

      const tierAuth = await AuthForTierSpendLimitService(
        issuerAccountID,
        InitialAmount,
        Denomination,
        securedCredex,
        requestId
      );

      if (!tierAuth.success || !tierAuth.data?.isAuthorized) {
        logger.warn("Insufficient membership tier for secured credex", {
          issuerAccountID,
          InitialAmount,
          Denomination,
          requestId,
          message: tierAuth.message
        });
        return res.status(403).json({
          success: false,
          error: tierAuth.message
        });
      }
    }

    // Validate due date for unsecured credex
    if (!securedCredex) {
      if (!dueDate) {
        logger.warn("Missing due date for unsecured credex", { requestId });
        return res.status(400).json({
          success: false,
          error: "Due date is required for unsecured credex"
        });
      }

      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logger.warn("Invalid due date", { dueDate, requestId });
        return res.status(400).json({
          success: false,
          error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`
        });
      }
    } else if (dueDate) {
      logger.warn("Due date provided for secured credex", { requestId });
      return res.status(400).json({
        success: false,
        error: "Due date is not allowed for secured credex"
      });
    }

    // Create the Credex
    logger.info("Creating new Credex", {
      memberID,
      issuerAccountID,
      receiverAccountID,
      credexType,
      requestId
    });

    const createCredexData = await CreateCredexService(req.body);

    if (!createCredexData || typeof createCredexData.credex === "boolean") {
      logger.warn("Failed to create Credex", {
        error: createCredexData.message,
        requestId
      });
      return res.status(400).json({
        success: false,
        error: createCredexData.message || "Failed to create Credex"
      });
    }

    // Fetch updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      memberID,
      issuerAccountID,
      requestId
    });

    const dashboardData = await GetAccountDashboardService(
      memberID,
      issuerAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data after successful creation", {
        memberID,
        issuerAccountID,
        requestId
      });
      return res.status(200).json({
        success: true,
        data: {
          createCredexData,
          dashboardData: null
        },
        message: "Credex created successfully but failed to fetch updated dashboard"
      });
    }

    logger.info("Credex created successfully", {
      credexID: createCredexData.credex.credexID,
      memberID,
      issuerAccountID,
      receiverAccountID,
      requestId
    });

    return res.status(200).json({
      success: true,
      data: {
        createCredexData,
        dashboardData
      },
      message: "Credex created successfully"
    });

  } catch (error) {
    logger.error("Unexpected error in CreateCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    next(error);
  } finally {
    logger.debug("Exiting CreateCredexController", { requestId });
  }
}
