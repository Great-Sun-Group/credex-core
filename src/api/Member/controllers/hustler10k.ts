import express, { Response, NextFunction } from "express";
import { UserRequest } from "../../../types/auth";
import { Hustler10kService } from "../services/Hustler10k";
import { handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { 
  TypedApiResponse, 
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type Hustler10kDetails = MemberActionDetails & {
  credexID: string;
  newTier: number;
};

type Hustler10kResponse = TypedApiResponse<Hustler10kDetails>;
type Hustler10kErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * Hustler10kController
 * 
 * Handles the Hustler 10k program enrollment process:
 * 1. Creates a secured Credex from personal account to greatsun_ops
 * 2. Auto-accepts the offer on behalf of greatsun_ops
 * 3. Updates member tier to 3
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function Hustler10kController(
  req: UserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.body.requestId || 'hustler10k-' + Date.now();
  // Get memberID from auth middleware's user object
  const memberID = req.user.memberID;
  const { personalAccountID } = req.body;

  logger.info("Entering Hustler10kController", {
    memberID,
    personalAccountID,
    requestId,
  });

  try {
    if (!personalAccountID) {
      logger.error("Missing personalAccountID", { requestId });
      
      const errorResponse: Hustler10kErrorResponse = {
        message: "personalAccountID is required",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: "MISSING_PARAMS",
              reason: "personalAccountID is required",
              field: "personalAccountID"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Calling Hustler10kService", {
      memberID,
      personalAccountID,
      requestId
    });

    const result = await Hustler10kService(memberID, personalAccountID);

    if (!result.success || !result.data) {
      logger.error("Hustler10k enrollment failed", {
        error: result.error,
        message: result.message,
        memberID,
        personalAccountID,
        requestId
      });

      const errorResponse: Hustler10kErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: result.error?.code || "ENROLLMENT_FAILED",
              reason: result.error?.details || result.message
            }
          },
          dashboard: {}
        }
      };

      res.status(500).json(errorResponse);
      return;
    }

    logger.info("Hustler 10k enrollment successful", {
      memberID,
      credexID: result.data.credexID,
      newTier: result.data.newTier,
      requestId
    });

    const response: Hustler10kResponse = {
      message: "Successfully enrolled in Hustler 10k program",
      data: {
        action: {
          id: result.data.credexID,
          type: ApiActionType.HUSTLER_10K_ENROLLED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            credexID: result.data.credexID,
            newTier: result.data.newTier
          }
        },
        dashboard: {} // Empty dashboard since this is just an enrollment endpoint
      }
    };

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in Hustler10kController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberID,
      personalAccountID,
      requestId
    });

    const errorResponse: Hustler10kErrorResponse = {
      message: "Failed to process Hustler 10k enrollment",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            code: handledError.code || "INTERNAL_ERROR",
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);
  } finally {
    logger.info("Exiting Hustler10kController", { requestId });
  }
}
