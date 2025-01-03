import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService } from "../../Member/services/SpendLimitService";
import { UserRequest } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { CredexNotificationService } from "../../Notifications/services/CredexNotificationService";
import { denomFormatter } from "../../../utils/denomUtils";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);
import { 
  ApiActionType, 
  TypedApiResponse, 
  CredexActionDetails, 
  ErrorActionDetails 
} from "../../../types/apiResponse";

type AcceptCredexResponse = TypedApiResponse<CredexActionDetails>;
type AcceptCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AcceptCredexController
 *
 * This controller handles the acceptance of Credex offers.
 * It validates the required fields, calls the AcceptCredexService,
 * and returns the result along with updated dashboard data.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 */
export async function AcceptCredexController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering AcceptCredexController", { 
    requestId,
    body: req.body 
  });

  try {
    // Initialize notification service
    const notificationService = await CredexNotificationService.getInstance();

    const { credexID } = req.body;
    const signerID = req.user.memberID;

    // Input validation is handled by validateRequest middleware
    logger.info("Accepting Credex", {
      credexID,
      signerID,
      requestId
    });

    const acceptCredexResult = await AcceptCredexService(
      credexID,
      signerID,
      requestId
    );
    
    if (!acceptCredexResult || !acceptCredexResult.success || !acceptCredexResult.data) {
      logger.warn("Failed to accept Credex", { 
        credexID, 
        signerID, 
        requestId,
        error: acceptCredexResult?.message
      });

      const errorResponse: AcceptCredexErrorResponse = {
        message: acceptCredexResult?.message || "Failed to accept Credex",
        data: {
          action: {
            id: credexID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "ACCEPT_FAILED",
              reason: acceptCredexResult?.message || "Failed to accept Credex",
              suggestion: "Please try again or contact support if the issue persists"
            }
          },
          dashboard: {}
        }
      };
      return res.status(400).json(errorResponse);
    }

    logger.debug("Fetching updated dashboard data", {
      signerID,
      acceptorAccountID: acceptCredexResult.data.acceptorAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      signerID,
      acceptCredexResult.data.acceptorAccountID,
      requestId,
      memberDashboardService
    );

    const successResponse: AcceptCredexResponse = {
      message: `${acceptCredexResult.data.secured ? 'Secured' : 'Unsecured'} credex for ${acceptCredexResult.data.amount} ${acceptCredexResult.data.denomination} accepted successfully`,
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_ACCEPTED,
          timestamp: acceptCredexResult.data.acceptedAt,
          actor: signerID,
          details: {
            amount: acceptCredexResult.data.amount,
            denomination: acceptCredexResult.data.denomination,
            securedCredex: acceptCredexResult.data.secured,
            acceptorAccountID: acceptCredexResult.data.acceptorAccountID
          }
        },
        dashboard
      }
    };

    logger.info("Credex accepted successfully", {
      credexID,
      signerID,
      requestId,
    });

    // Send notification for offer acceptance
    try {
      await notificationService.notifyOfferAccepted({
        issuerMemberID: acceptCredexResult.data.issuerMemberID,
        credexID: acceptCredexResult.data.credexID,
        amount: denomFormatter(parseFloat(acceptCredexResult.data.amount), acceptCredexResult.data.denomination),
        denomination: acceptCredexResult.data.denomination,
        counterpartyName: acceptCredexResult.data.acceptorAccountID,
        requestId
      });
    } catch (error) {
      // Log but don't fail the request
      logger.error("Failed to send notification", {
        error: error instanceof Error ? error.message : "Unknown error",
        requestId
      });
    }

    return res.status(200).json(successResponse);

  } catch (err) {
    // Handle specific error cases with appropriate status codes
    if (err instanceof Error) {
      if (err.message === 'Credex already accepted') {
        logger.warn("Attempt to accept already accepted Credex", { 
          error: err.message,
          requestId 
        });
        const errorResponse: AcceptCredexErrorResponse = {
          message: "Credex has already been accepted",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "ALREADY_ACCEPTED",
                reason: "Credex has already been accepted",
                field: "credexID"
              }
            },
            dashboard: {}
          }
        };
        return res.status(409).json(errorResponse);
      }
      
      if (err.message === 'Credex not found') {
        logger.warn("Attempt to accept non-existent Credex", { 
          error: err.message,
          requestId 
        });
        const errorResponse: AcceptCredexErrorResponse = {
          message: "Credex not found",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "CREDEX_NOT_FOUND",
                reason: "The specified Credex could not be found",
                field: "credexID"
              }
            },
            dashboard: {}
          }
        };
        return res.status(404).json(errorResponse);
      }

      if (err.message.includes('digital signature')) {
        logger.error("Digital signature error in AcceptCredexController", {
          error: err.message,
          stack: err.stack,
          requestId,
        });
        const errorResponse: AcceptCredexErrorResponse = {
          message: "Failed to accept Credex: Digital signature error",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: req.user.memberID,
              details: {
                code: "SIGNATURE_ERROR",
                reason: "Failed to create digital signature",
                suggestion: "Please try again or contact support if the issue persists"
              }
            },
            dashboard: {}
          }
        };
        return res.status(400).json(errorResponse);
      }
    }

    // Handle unexpected errors
    logger.error("Unexpected error in AcceptCredexController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    
    const errorResponse: AcceptCredexErrorResponse = {
      message: "An unexpected error occurred while accepting the Credex",
      data: {
        action: {
          id: req.body.credexID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: err instanceof Error ? err.message : "Unknown error",
            suggestion: "Please try again or contact support if the issue persists"
          }
        },
        dashboard: {}
      }
    };
    
    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting AcceptCredexController", { requestId });
  }
}
