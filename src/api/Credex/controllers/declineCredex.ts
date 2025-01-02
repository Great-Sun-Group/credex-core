import express from "express";
import { DeclineCredexService } from "../services/DeclineCredex";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService } from "../../Member/services/SpendLimitService";
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

type DeclineCredexResponse = TypedApiResponse<CredexActionDetails>;
type DeclineCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

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
      requestId,
    });

    const responseData = await DeclineCredexService(
      credexID,
      signerID,
      requestId
    );

    if (!responseData || !responseData.success || !responseData.data) {
      logger.warn("Failed to decline Credex - not found or already processed", {
        credexID,
        signerID,
        requestId,
      });
      const errorResponse: DeclineCredexErrorResponse = {
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
          dashboard: { member: null, account: null },
        },
      };
      return res.status(404).json(errorResponse);
    }

    // Get updated standardized dashboard data for the receiver's account
    logger.debug("Fetching updated dashboard data", {
      signerID,
      receiverAccountID: responseData.data.receiverAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      signerID,
      responseData.data.receiverAccountID,
      requestId,
      memberDashboardService
    );

    const successResponse: DeclineCredexResponse = {
      message: "Credex declined successfully",
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_DECLINED,
          timestamp: responseData.data.declinedAt,
          actor: signerID,
          details: {
            amount: "0", // Amount is zeroed on decline
            denomination: responseData.data.denomination, // Use denomination from response
            securedCredex: false, // Not relevant for declined Credex
            receiverAccountID: responseData.data.receiverAccountID,
            reason: "Declined by receiver",
          },
        },
        dashboard,
      },
    };

    logger.info("Credex declined successfully", {
      credexID,
      signerID,
      requestId,
    });

    // Send notification to issuer if they have a memberID and notification service is initialized
    if (responseData.data.issuerMemberID && notificationService) {
      try {
        await notificationService.sendNotification({
          type: 'OFFER_DECLINED',
          recipientID: responseData.data.issuerMemberID,
          data: {
            credexID: responseData.data.credexID,
            amount: "0", // Amount is zeroed on decline
            denomination: responseData.data.denomination,
            counterpartyName: responseData.data.receiverAccountName
          }
        });
      } catch (notificationError) {
        // Log notification error but don't fail the request
        logger.error("Failed to send notification for declined Credex", {
          error: notificationError instanceof Error ? notificationError.message : "Unknown error",
          credexID: responseData.data.credexID,
          requestId,
        });
      }
    } else if (!responseData.data.issuerMemberID) {
      logger.debug("No memberID found for issuer, skipping notification", {
        issuerAccountID: responseData.data.issuerAccountID,
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
        logger.warn("Attempt to decline already processed Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: DeclineCredexErrorResponse = {
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
        logger.warn("Attempt to decline non-existent Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: DeclineCredexErrorResponse = {
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
        logger.warn("Unauthorized attempt to decline Credex", {
          error: error.message,
          requestId,
        });
        const errorResponse: DeclineCredexErrorResponse = {
          message: "Not authorized to decline this Credex",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "UNAUTHORIZED",
                reason:
                  "You must be authorized for the receiving account to decline this Credex",
              },
            },
            dashboard: {},
          },
        };
        return res.status(403).json(errorResponse);
      }

      if (error.message.includes("digital signature")) {
        logger.error("Digital signature error in DeclineCredexController", {
          error: error.message,
          stack: error.stack,
          requestId,
        });
        const errorResponse: DeclineCredexErrorResponse = {
          message: "Failed to decline Credex: Digital signature error",
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

    logger.error("Unexpected error in DeclineCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: DeclineCredexErrorResponse = {
      message: "An unexpected error occurred while declining the Credex",
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
    logger.debug("Exiting DeclineCredexController", { requestId });
  }
}
