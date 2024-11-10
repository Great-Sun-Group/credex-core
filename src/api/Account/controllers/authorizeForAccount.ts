import express from "express";
import { AuthorizeForAccountService } from "../services/AuthorizeForAccount";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

// Import the UserRequest interface from authentication module
import type { Request } from "express";
interface UserRequest extends Request {
  user?: any;
}

interface AuthorizeResponse {
  success: boolean;
  data?: {
    accountID: string;
    memberIdAuthorized: string;
  };
  message: string;
}

/**
 * AuthorizeForAccountController
 * 
 * Handles requests to authorize a member for account access.
 * Validates membership tier requirements and authorization limits.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AuthorizeForAccountController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AuthorizeForAccountController", { requestId });

  try {
    const ownerID = req.user?.memberID;
    if (!ownerID) {
      logger.warn("No authenticated user found", { requestId });
      res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
      return;
    }

    const { memberHandleToBeAuthorized, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Authorizing member for account", {
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });

    const result = await AuthorizeForAccountService(
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    );

    if (!result.success) {
      const statusCode = 
        result.message.includes("Entrepreneur tier") ? 403 :
        result.message.includes("Limit of 5") ? 400 :
        400;

      logger.warn("Authorization failed", {
        memberHandleToBeAuthorized,
        accountID,
        ownerID,
        message: result.message,
        requestId
      });

      res.status(statusCode).json(result);
      return;
    }

    logger.info("Member authorized for account successfully", {
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });

    res.status(200).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in AuthorizeForAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberHandleToBeAuthorized: req.body.memberHandleToBeAuthorized,
      accountID: req.body.accountID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
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
    logger.debug("Exiting AuthorizeForAccountController", { requestId });
  }
}
