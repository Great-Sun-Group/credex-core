import express from "express";
import { UpdateSendOffersToService } from "../services/UpdateSendOffersTo";
import { UserRequest } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";
import { withDashboard } from "../../../utils/dashboardUtils";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type UpdateSendOffersResponse = TypedApiResponse<AccountActionDetails>;
type UpdateSendOffersErrorResponse = TypedApiResponse<ErrorActionDetails>;

// Initialize services
const memberDashboardService = new MemberDashboardService(
  // TODO: Add proper repository instances
  null as any,
  null as any
);

/**
 * UpdateSendOffersToController
 * 
 * Handles updating which member can receive offers from an account.
 * 
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UpdateSendOffersToController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("UpdateSendOffersToController called", { 
    body: req.body,
    requestId 
  });

  const { memberIDtoSendOffers, accountID } = req.body;
  const ownerID = req.user.memberID;

  try {
    // Validate input
    if (!validateUUID(memberIDtoSendOffers)) {
      logger.warn("Invalid memberIDtoSendOffers provided", {
        memberIDtoSendOffers,
        requestId
      });

      const errorResponse: UpdateSendOffersErrorResponse = {
        message: "Invalid memberIDtoSendOffers format",
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_MEMBER_ID",
              reason: "Invalid memberIDtoSendOffers format",
              field: "memberIDtoSendOffers"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID provided", { 
        accountID,
        requestId 
      });

      const errorResponse: UpdateSendOffersErrorResponse = {
        message: "Invalid accountID format",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_ACCOUNT_ID",
              reason: "Invalid accountID format",
              field: "accountID"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    if (!validateUUID(ownerID)) {
      logger.warn("Invalid ownerID provided", { 
        ownerID,
        requestId 
      });

      const errorResponse: UpdateSendOffersErrorResponse = {
        message: "Invalid ownerID format",
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_OWNER_ID",
              reason: "Invalid ownerID format",
              field: "ownerID"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Updating offer recipient for account", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
      requestId
    });

    const result = await UpdateSendOffersToService(
      memberIDtoSendOffers,
      accountID,
      ownerID
    );

    if (!result.success) {
      logger.warn("Failed to update offer recipient for account", {
        memberIDtoSendOffers,
        accountID,
        ownerID,
        message: result.message,
        requestId
      });

      const errorResponse: UpdateSendOffersErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "UPDATE_FAILED",
              reason: result.message
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Offer recipient updated successfully for account", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
      requestId
    });

    // Create base response without dashboard
    const baseResponse = {
      message: result.message,
      data: {
        action: {
          id: accountID,
          type: ApiActionType.SEND_OFFERS_UPDATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID,
            sendOffersTo: result.data!.sendOffersTo
          }
        }
      }
    };

    // Add dashboard data to response
    const response = await withDashboard(
      baseResponse,
      ownerID,
      accountID,
      requestId,
      memberDashboardService
    );

    res.status(200).json(response);

  } catch (error) {
    logger.error("Error in UpdateSendOffersToController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoSendOffers: req.body.memberIDtoSendOffers,
      accountID: req.body.accountID,
      ownerID,
      requestId
    });

    const errorResponse: UpdateSendOffersErrorResponse = {
      message: error instanceof Error ? error.message : "An unknown error occurred",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error"
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(error);
  }
}
