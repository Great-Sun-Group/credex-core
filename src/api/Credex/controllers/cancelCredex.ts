import express from "express";
import { CancelCredexService } from "../services/CancelCredex";
import logger from "../../../utils/logger";

/**
 * CancelCredexController
 *
 * This controller handles the cancellation of Credex offers.
 * It processes the cancellation request and returns the updated status.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CancelCredexController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering CancelCredexController", { requestId });

  try {
    const { credexID, signerID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Cancelling Credex", {
      credexID,
      signerID,
      requestId
    });

    const responseData = await CancelCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData) {
      logger.warn("Failed to cancel Credex - not found or already processed", {
        credexID,
        signerID,
        requestId
      });
      return res.status(404).json({
        success: false,
        error: "Credex not found or already processed"
      });
    }

    logger.info("Credex cancelled successfully", {
      credexID,
      signerID,
      requestId
    });

    return res.status(200).json({
      success: true,
      data: {
        credexID: responseData
      },
      message: "Credex cancelled successfully"
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already processed')) {
        logger.warn("Attempt to cancel already processed Credex", {
          error: error.message,
          requestId
        });
        return res.status(409).json({
          success: false,
          error: "Credex has already been processed"
        });
      }

      if (error.message.includes('not found')) {
        logger.warn("Attempt to cancel non-existent Credex", {
          error: error.message,
          requestId
        });
        return res.status(404).json({
          success: false,
          error: "Credex not found"
        });
      }

      if (error.message.includes('not authorized')) {
        logger.warn("Unauthorized attempt to cancel Credex", {
          error: error.message,
          requestId
        });
        return res.status(403).json({
          success: false,
          error: "Not authorized to cancel this Credex"
        });
      }

      if (error.message.includes('digital signature')) {
        logger.error("Digital signature error in CancelCredexController", {
          error: error.message,
          stack: error.stack,
          requestId
        });
        return res.status(400).json({
          success: false,
          error: "Failed to cancel Credex: Digital signature error"
        });
      }
    }

    logger.error("Unexpected error in CancelCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    next(error);
  } finally {
    logger.debug("Exiting CancelCredexController", { requestId });
  }
}
