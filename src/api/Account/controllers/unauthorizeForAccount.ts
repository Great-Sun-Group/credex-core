import express from "express";
import { UnauthorizeForAccountService } from "../services/UnauthorizeForAccount";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface UnauthorizeResponse {
  success: boolean;
  data?: {
    accountID: string;
    memberIdUnauthorized: string;
  };
  message: string;
}

/**
 * UnauthorizeForAccountController
 * 
 * Handles requests to remove authorization for a member to access an account.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UnauthorizeForAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering UnauthorizeForAccountController", { requestId });

  try {
    const { memberIDtoBeUnauthorized, accountID, ownerID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Unauthorizing member for account", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });

    const result = await UnauthorizeForAccountService(
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    );

    if (!result.success) {
      logger.warn("Failed to unauthorize member for account", {
        memberIDtoBeUnauthorized,
        accountID,
        ownerID,
        message: result.message,
        requestId
      });

      res.status(400).json(result);
      return;
    }

    logger.info("Member unauthorized for account successfully", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });

    res.status(200).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in UnauthorizeForAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberIDtoBeUnauthorized: req.body.memberIDtoBeUnauthorized,
      accountID: req.body.accountID,
      ownerID: req.body.ownerID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("not authorized") ? 403 :
        handledError.message.includes("Invalid") ? 400 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting UnauthorizeForAccountController", { requestId });
  }
}
