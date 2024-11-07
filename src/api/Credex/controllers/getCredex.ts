import express from "express";
import { GetCredexService } from "../services/GetCredex";
import logger from "../../../utils/logger";

/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It fetches the Credex data and returns it with associated information.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetCredexController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering GetCredexController", { requestId });

  try {
    const { credexID, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Fetching Credex details", {
      credexID,
      accountID,
      requestId
    });

    const responseData = await GetCredexService(
      credexID,
      accountID
    );

    if (!responseData) {
      logger.warn("Credex not found or not accessible", {
        credexID,
        accountID,
        requestId
      });
      return res.status(404).json({
        success: false,
        error: "Credex not found or not accessible"
      });
    }

    // Check if the response contains error information
    if ('error' in responseData) {
      logger.warn("Error retrieving Credex details", {
        credexID,
        accountID,
        error: responseData.error,
        requestId
      });
      return res.status(400).json({
        success: false,
        error: responseData.error
      });
    }

    logger.info("Credex details retrieved successfully", {
      credexID,
      accountID,
      requestId
    });

    return res.status(200).json({
      success: true,
      data: {
        credexData: responseData.credexData,
        clearedAgainstData: responseData.clearedAgainstData
      },
      message: "Credex details retrieved successfully"
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not authorized')) {
        logger.warn("Unauthorized attempt to access Credex", {
          error: error.message,
          requestId
        });
        return res.status(403).json({
          success: false,
          error: "Not authorized to access this Credex"
        });
      }

      if (error.message === 'No records found') {
        logger.warn("Attempt to access non-existent Credex", {
          error: error.message,
          requestId
        });
        return res.status(404).json({
          success: false,
          error: "Credex not found"
        });
      }

      if (error.message.includes('database error')) {
        logger.error("Database error in GetCredexController", {
          error: error.message,
          stack: error.stack,
          requestId
        });
        return res.status(500).json({
          success: false,
          error: "Failed to retrieve Credex details due to database error"
        });
      }
    }

    logger.error("Unexpected error in GetCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    next(error);
  } finally {
    logger.debug("Exiting GetCredexController", { requestId });
  }
}
