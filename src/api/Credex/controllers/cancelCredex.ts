import express from "express";
import { CancelCredexService } from "../services/CancelCredex";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository, IMemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService, ISpendLimitService } from "../../Member/services/SpendLimitService";
import { UserRequest } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { NotificationService } from "../../Notifications/NotificationService";

// Initialize notification service
let notificationService: Awaited<ReturnType<typeof NotificationService.getInstance>>;
(async () => {
  try {
    notificationService = await NotificationService.getInstance();
  } catch (error) {
    logger.error("Failed to initialize notification service:", error);
  }
})();

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);
import {
  ApiActionType,
  TypedApiResponse,
  CredexActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";

type CancelCredexResponse = TypedApiResponse<CredexActionDetails>;
type CancelCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

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
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering CancelCredexController", { requestId });

  try {
    const { credexID } = req.body;
    const signerID = req.user.memberID;

    // Basic validation is handled by validateRequest middleware
    logger.info("Cancelling Credex", {
      credexID,
      signerID,
      requestId,
    });

    const responseData = await CancelCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData || !responseData.success || !responseData.data) {
      logger.warn("Failed to cancel Credex - not found or already processed", {
        credexID,
        signerID,
        requestId,
      });
      const errorResponse: CancelCredexErrorResponse = {
        message: "Credex not found or already processed",
        data: {
          action: {
            id: credexID,
            type: ApiActionType.ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "NOT_FOUND",
              reason: "Credex not found or already processed",
              field: "credexID",
            },
          },
          dashboard: {},
        },
      };
      return res.status(404).json(errorResponse);
    }

    // Get updated standardized dashboard data for the issuer's account
    logger.debug("Fetching updated dashboard data", {
      signerID,
      issuerAccountID: responseData.data.issuerAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      signerID,
      responseData.data.issuerAccountID,
      requestId,
      memberDashboardService
    );

    const successResponse: CancelCredexResponse = {
      message: "Credex cancelled successfully",
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_CANCELLED,
          timestamp: responseData.data.cancelledAt,
          actor: signerID,
          details: {
            amount: "0", // Amount is zeroed on cancellation
            denomination: responseData.data.denomination, // Use denomination from response
            securedCredex: false, // Not relevant for cancelled Credex
            receiverAccountID: responseData.data.receiverAccountID,
            reason: "Cancelled by issuer",
          },
        },
        dashboard,
      },
    };

    logger.info("Credex cancelled successfully", {
      credexID,
      signerID,
      requestId,
    });

    // Send notification to receiver if they have a memberID and notification service is initialized
    if (responseData.data.receiverMemberID && notificationService) {
      try {
        await notificationService.sendNotification({
          type: 'OFFER_CANCELLED',
          recipientID: responseData.data.receiverMemberID,
          data: {
            credexID: responseData.data.credexID,
            amount: successResponse.data.action.details.amount,
            denomination: responseData.data.denomination,
            counterpartyName: responseData.data.issuerAccountName
          }
        });
      } catch (notificationError) {
        // Log notification error but don't fail the request
        logger.error("Failed to send notification for cancelled Credex", {
          error: notificationError instanceof Error ? notificationError.message : "Unknown error",
          credexID: responseData.data.credexID,
          requestId,
        });
      }
    } else if (!responseData.data.receiverMemberID) {
      logger.debug("No memberID found for receiver, skipping notification", {
        receiverAccountID: responseData.data.receiverAccountID,
        requestId,
      });
    } else if (!notificationService) {
      logger.warn("Notification service not initialized, skipping notification", {
        credexID: responseData.data.credexID,
        requestId,
      });
    }

    return res.status(200).json(successResponse);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already processed")) {
        logger.warn("Attempt to cancel already processed Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: CancelCredexErrorResponse = {
          message: "Credex has already been processed",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "ALREADY_PROCESSED",
                reason: "This Credex has already been processed",
                field: "credexID",
              },
            },
            dashboard: {},
          },
        };
        return res.status(409).json(errorResponse);
      }

      if (error.message.includes("not found")) {
        logger.warn("Attempt to cancel non-existent Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: CancelCredexErrorResponse = {
          message: "Credex not found",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "NOT_FOUND",
                reason: "The specified Credex could not be found",
                field: "credexID",
              },
            },
            dashboard: {},
          },
        };
        return res.status(404).json(errorResponse);
      }

      if (error.message.includes("not authorized")) {
        logger.warn("Unauthorized attempt to cancel Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: CancelCredexErrorResponse = {
          message: "Not authorized to cancel this Credex",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "UNAUTHORIZED",
                reason:
                  "You must be authorized for the issuing account to cancel this Credex",
              },
            },
            dashboard: {},
          },
        };
        return res.status(403).json(errorResponse);
      }

      if (error.message.includes("digital signature")) {
        logger.error("Digital signature error in CancelCredexController", {
          error: error.message,
          stack: error.stack,
          requestId,
        });
        const errorResponse: CancelCredexErrorResponse = {
          message: "Failed to cancel Credex: Digital signature error",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "SIGNATURE_ERROR",
                reason: "Failed to create digital signature",
                suggestion:
                  "Please try again or contact support if the issue persists",
              },
            },
            dashboard: {},
          },
        };
        return res.status(400).json(errorResponse);
      }
    }

    logger.error("Unexpected error in CancelCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: CancelCredexErrorResponse = {
      message: "An unexpected error occurred while cancelling the Credex",
      data: {
        action: {
          id: req.body.credexID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion:
              "Please try again or contact support if the issue persists",
          },
        },
        dashboard: {},
      },
    };

    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting CancelCredexController", { requestId });
  }
}
