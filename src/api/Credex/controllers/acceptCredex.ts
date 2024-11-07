import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../utils/logger";

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
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering AcceptCredexController", { 
    requestId,
    body: req.body 
  });

  try {
    const { credexID, signerID } = req.body;

    // Input validation is handled by validateRequest middleware
    logger.info("Accepting Credex", {
      credexID,
      signerID,
      requestId
    });

    const acceptCredexData = await AcceptCredexService(
      credexID,
      signerID,
      requestId
    );
    
    if (!acceptCredexData) {
      logger.warn("Failed to accept Credex - service returned null", { 
        credexID, 
        signerID, 
        requestId 
      });
      return res.status(400).json({
        success: false,
        error: "Failed to accept Credex"
      });
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
      logger.warn("Failed to fetch dashboard data after successful acceptance", {
        signerID,
        acceptorAccountID: acceptCredexData.acceptorAccountID,
        requestId,
      });
      return res.status(200).json({
        success: true,
        data: {
          acceptCredexData,
          dashboardData: null
        },
        message: "Credex accepted successfully but failed to fetch updated dashboard"
      });
    }

    logger.info("Credex accepted successfully", {
      credexID,
      signerID,
      requestId,
    });

    return res.status(200).json({
      success: true,
      data: {
        acceptCredexData,
        dashboardData
      },
      message: "Credex accepted successfully"
    });

  } catch (err) {
    // Handle specific error cases with appropriate status codes
    if (err instanceof Error) {
      if (err.message === 'Credex already accepted') {
        logger.warn("Attempt to accept already accepted Credex", { 
          error: err.message,
          requestId 
        });
        return res.status(409).json({
          success: false,
          error: "Credex has already been accepted"
        });
      }
      
      if (err.message === 'Credex not found') {
        logger.warn("Attempt to accept non-existent Credex", { 
          error: err.message,
          requestId 
        });
        return res.status(404).json({
          success: false,
          error: "Credex not found"
        });
      }

      if (err.message.includes('digital signature')) {
        logger.error("Digital signature error in AcceptCredexController", {
          error: err.message,
          stack: err.stack,
          requestId,
        });
        return res.status(400).json({
          success: false,
          error: "Failed to accept Credex: Digital signature error"
        });
      }
    }

    // Handle unexpected errors
    logger.error("Unexpected error in AcceptCredexController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    
    next(err);
  } finally {
    logger.debug("Exiting AcceptCredexController", { requestId });
  }
}
