import express from "express";
import { DeclineCredexService } from "../services/DeclineCredex";
import logger from "../../../utils/logger";

// Import the UserRequest interface from authentication module
import type { Request } from "express";
interface UserRequest extends Request {
  user: any;
}

/**
 * DeclineCredexController
 *
 * This controller handles the declining of Credex offers.
 * It processes the decline request and returns the updated status.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function DeclineCredexController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering DeclineCredexController", { requestId });

  try {
    const { credexID } = req.body;
    const signerID = req.user.memberID;
    
    // Basic validation is handled by validateRequest middleware
    logger.info("Declining Credex", {
      credexID,
      signerID,
      requestId
    });

    const responseData = await DeclineCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData) {
      logger.warn("Failed to decline Credex - not found or already processed", {
        credexID,
        signerID,
        requestId
      });
      return res.status(404).json({
        success: false,
        error: "Credex not found or already processed"
      });
    }

    logger.info("Credex declined successfully", {
      credexID,
      signerID,
      requestId
    });

    return res.status(200).json({
      success: true,
      data: {
        credexID: responseData
      },
      message: "Credex declined successfully"
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already processed')) {
        logger.warn("Attempt to decline already processed Credex", {
          error: error.message,
          requestId
        });
        return res.status(409).json({
          success: false,
          error: "Credex has already been processed"
        });
      }

      if (error.message.includes('not found')) {
        logger.warn("Attempt to decline non-existent Credex", {
          error: error.message,
          requestId
        });
        return res.status(404).json({
          success: false,
          error: "Credex not found"
        });
      }

      if (error.message.includes('digital signature')) {
        logger.error("Digital signature error in DeclineCredexController", {
          error: error.message,
          stack: error.stack,
          requestId
        });
        return res.status(400).json({
          success: false,
          error: "Failed to decline Credex: Digital signature error"
        });
      }
    }

    logger.error("Unexpected error in DeclineCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    next(error);
  } finally {
    logger.debug("Exiting DeclineCredexController", { requestId });
  }
}
