import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";
import { 
  ApiActionType, 
  TypedApiResponse, 
  CredexBulkActionDetails, 
  ErrorActionDetails 
} from "../../../types/apiResponse";

// Import the UserRequest interface from authentication module
import type { Request } from "express";
interface UserRequest extends Request {
  user?: any;
}

type AcceptCredexBulkResponse = TypedApiResponse<CredexBulkActionDetails>;
type AcceptCredexBulkErrorResponse = TypedApiResponse<ErrorActionDetails>;

type AcceptedResult = {
  status: 'accepted';
  credexID: string;
  data: any;
};

type FailedResult = {
  status: 'failed';
  credexID: string;
  error: string;
};

type AlreadyAcceptedResult = {
  status: 'already_accepted';
  credexID: string;
};

type ErrorResult = {
  status: 'error';
  credexID: string;
  error: string;
};

type CredexResult = AcceptedResult | FailedResult | AlreadyAcceptedResult | ErrorResult;

/**
 * AcceptCredexBulkController
 *
 * This controller handles the bulk acceptance of multiple Credex offers.
 * It validates the required fields, calls the AcceptCredexService for each Credex,
 * fetches updated dashboard data, and returns the result.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 */
export async function AcceptCredexBulkController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering AcceptCredexBulkController", { requestId });

  // Get signerID from authenticated user
  const signerID = req.user?.memberID;
  if (!signerID) {
    logger.warn("No authenticated user found", { requestId });
    const errorResponse: AcceptCredexBulkErrorResponse = {
      message: "Authentication required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "UNAUTHORIZED",
            reason: "Authentication required"
          }
        },
        dashboard: {}
      }
    };
    return res.status(401).json(errorResponse);
  }

  // Validate required fields
  const { credexIDs } = req.body;
  if (!credexIDs) {
    logger.warn("credexIDs is required", { requestId });
    const errorResponse: AcceptCredexBulkErrorResponse = {
      message: "credexIDs is required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: signerID,
          details: {
            code: "MISSING_PARAMS",
            reason: "credexIDs array is required",
            field: "credexIDs"
          }
        },
        dashboard: {}
      }
    };
    return res.status(400).json(errorResponse);
  }

  // Validate credexIDs array
  if (
    !Array.isArray(credexIDs) ||
    !credexIDs.every(
      (id: any) => typeof id === "string" && validateUUID(id)
    )
  ) {
    logger.warn("Invalid credexIDs", {
      requestId,
      credexIDs,
    });
    const errorResponse: AcceptCredexBulkErrorResponse = {
      message: "Array of valid credexIDs (UUIDs) to accept is required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: signerID,
          details: {
            code: "INVALID_PARAMS",
            reason: "All credexIDs must be valid UUIDs",
            field: "credexIDs"
          }
        },
        dashboard: {}
      }
    };
    return res.status(400).json(errorResponse);
  }

  try {
    logger.debug("Starting bulk accept process", {
      requestId,
      credexCount: credexIDs.length,
    });

    const results = await Promise.all(
      credexIDs.map(async (credexID: string) => {
        logger.debug("Processing individual Credex", { requestId, credexID });
        
        try {
          const data = await AcceptCredexService(
            credexID,
            signerID,
            requestId,
            true, // This is a bulk operation
            credexIDs // Pass all credexIDs for bulk signature
          );
          
          if (data?.success && data.data) {
            logger.debug("Credex accepted successfully", { requestId, credexID });
            return {
              status: 'accepted' as const,
              credexID,
              data: data.data
            };
          }
          
          logger.warn("Failed to accept Credex", { requestId, credexID });
          return {
            status: 'failed' as const,
            credexID,
            error: data?.message || 'Failed to accept credex'
          };
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // Handle already accepted credex gracefully
          if (errorMessage.includes('already accepted')) {
            logger.info("Credex was already accepted", { requestId, credexID });
            return {
              status: 'already_accepted' as const,
              credexID
            };
          }
          
          logger.error("Error accepting credex", {
            error: errorMessage,
            requestId,
            credexID
          });
          return {
            status: 'error' as const,
            credexID,
            error: errorMessage
          };
        }
      })
    );

    // Filter successful acceptances
    const acceptedCredex = results.filter(
      (result): result is AcceptedResult => result.status === 'accepted'
    );

    // Group other results for reporting
    const alreadyAccepted = results.filter((result): result is AlreadyAcceptedResult => result.status === 'already_accepted');
    const failed = results.filter((result): result is FailedResult | ErrorResult => 
      result.status === 'failed' || result.status === 'error'
    );

    logger.debug("Processed all credex", {
      requestId,
      accepted: acceptedCredex.length,
      alreadyAccepted: alreadyAccepted.length,
      failed: failed.length
    });

    if (acceptedCredex.length > 0 || alreadyAccepted.length > 0) {
      // Get dashboard data if any credex were processed successfully
      const firstAccepted = acceptedCredex[0]?.data;
      const acceptorAccountID = firstAccepted?.acceptorAccountID;

      logger.debug("Fetching dashboard data", {
        requestId,
        memberID: signerID,
        acceptorAccountID,
      });

      const dashboard = acceptorAccountID ? 
        await GetAccountDashboardService(signerID, acceptorAccountID) :
        null;

      logger.info("Bulk accept operation completed", {
        accepted: acceptedCredex.length,
        alreadyAccepted: alreadyAccepted.length,
        failed: failed.length,
        requestId
      });

      const successResponse: AcceptCredexBulkResponse = {
        message: `Successfully processed ${acceptedCredex.length + alreadyAccepted.length} out of ${results.length} Credex transactions`,
        data: {
          action: {
            id: null, // No single ID for bulk operation
            type: ApiActionType.CREDEX_BULK_ACCEPTED,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              summary: {
                accepted: acceptedCredex.map(r => r.credexID),
                alreadyAccepted: alreadyAccepted.map(r => r.credexID),
                failed: failed.map(r => ({ credexID: r.credexID, error: r.error }))
              },
              totalProcessed: results.length,
              successCount: acceptedCredex.length + alreadyAccepted.length,
              failureCount: failed.length
            }
          },
          dashboard: dashboard || {}
        }
      };

      return res.status(200).json(successResponse);
    } else {
      // If nothing was processed successfully
      logger.warn("No credex were processed successfully", {
        requestId,
        failedCount: failed.length,
        errors: failed.map(f => f.error)
      });

      const errorResponse: AcceptCredexBulkErrorResponse = {
        message: "No credex were processed successfully",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "BULK_ACCEPT_FAILED",
              reason: "All Credex transactions failed to process",
              suggestion: "Please check individual error details and try again"
            }
          },
          dashboard: {}
        }
      };
      return res.status(400).json(errorResponse);
    }
  } catch (err) {
    logger.error("Error in AcceptCredexBulkController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    
    const errorResponse: AcceptCredexBulkErrorResponse = {
      message: "An unexpected error occurred during bulk accept operation",
      data: {
        action: {
          id: null,
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
    logger.debug("Exiting AcceptCredexBulkController", { requestId });
  }
}
