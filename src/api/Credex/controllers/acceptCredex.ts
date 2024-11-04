import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

/**
 * AcceptCredexController
 *
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("AcceptCredexController called", { 
    body: req.body, 
    requestId,
    context: 'AcceptCredexController'
  });

  try {
    const { credexID, signerID } = req.body;

    logger.debug("RequestId check", {
      requestId,
      hasRequestId: !!requestId,
      context: 'AcceptCredexController'
    });

    if (!validateUUID(credexID)) {
      logger.warn("Invalid credexID provided", { credexID, requestId });
      return res.status(400).json({ error: "Invalid credexID" });
    }

    if (!validateUUID(signerID)) {
      logger.warn("Invalid signerID provided", { signerID, requestId });
      return res.status(400).json({ error: "Invalid signerID" });
    }

    logger.debug("Calling AcceptCredexService", {
      credexID,
      signerID,
      requestId,
      context: 'AcceptCredexController'
    });
    const acceptCredexData = await AcceptCredexService(
      credexID,
      signerID,
      requestId
    );
    
    if (!acceptCredexData) {
      logger.warn("Failed to accept Credex", { credexID, signerID, requestId });
      return res.status(400).json({ error: "Failed to accept Credex" });
    }

    logger.debug("Fetching updated dashboard data", {
      signerID,
      acceptorAccountID: acceptCredexData.acceptorAccountID,
      requestId,
    });
    const dashboardData = await GetAccountDashboardService(
      signerID,
      acceptCredexData.acceptorAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        signerID,
        acceptorAccountID: acceptCredexData.acceptorAccountID,
        requestId,
      });
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    logger.info("Credex accepted successfully", {
      credexID,
      signerID,
      requestId,
    });

    return res.status(200).json({
      acceptCredexData: acceptCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    // Handle specific error cases
    if (err instanceof Error) {
      if (err.message === 'Credex already accepted') {
        logger.warn("Attempt to accept already accepted Credex", { 
          error: err.message,
          requestId 
        });
        return res.status(400).json({ error: "Credex has already been accepted" });
      }
      if (err.message.includes('digital signature')) {
        logger.error("Digital signature error in AcceptCredexController", {
          error: err.message,
          stack: err.stack,
          requestId,
        });
        return res.status(400).json({ error: `Failed to accept Credex: ${err.message}` });
      }
    }

    logger.error("Unhandled error in AcceptCredexController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
