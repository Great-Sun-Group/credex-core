import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";
import logger from "../../../utils/logger";
import { validateHandle } from "../../../utils/validators";
import { 
  TypedApiResponse, 
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type MemberLookupDetails = MemberActionDetails & {
  memberID: string;
  memberName: string;
  memberHandle: string;
};

type MemberLookupResponse = TypedApiResponse<MemberLookupDetails>;
type MemberLookupErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetMemberByHandleController
 * 
 * Handles retrieving member information using their handle.
 * Returns basic member details without sensitive information.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const GetMemberByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { memberHandle } = req.body;

  logger.debug("Entering GetMemberByHandleController", {
    memberHandle,
    requestId,
  });

  try {
    const handleValidation = validateHandle(memberHandle);
    if (!handleValidation.isValid) {
      logger.warn("Invalid member handle", { memberHandle, requestId });
      
      const errorResponse: MemberLookupErrorResponse = {
        message: handleValidation.message || 
          "Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_HANDLE",
              reason: handleValidation.message || "Invalid member handle format",
              field: "memberHandle"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Retrieving member by handle", { memberHandle, requestId });

    const result = await GetMemberByHandleService(memberHandle);

    if (!result.success || !result.data) {
      logger.info("Member not found", { memberHandle, requestId });
      
      const errorResponse: MemberLookupErrorResponse = {
        message: result.message || "Member not found",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: result.error?.code || "NOT_FOUND",
              reason: result.error?.details || "No member exists with the provided handle",
              field: "memberHandle"
            }
          },
          dashboard: {}
        }
      };

      res.status(404).json(errorResponse);
      return;
    }

    logger.info("Member retrieved successfully", {
      memberID: result.data.memberID,
      memberHandle,
      requestId,
    });

    const response: MemberLookupResponse = {
      message: result.message,
      data: {
        action: {
          id: result.data.memberID,
          type: ApiActionType.MEMBER_FOUND,
          timestamp: new Date().toISOString(),
          actor: result.data.memberID,
          details: {
            memberID: result.data.memberID,
            memberName: result.data.memberName,
            memberHandle: result.data.memberHandle
          }
        },
        dashboard: {} // Empty dashboard since this is just a lookup endpoint
      }
    };

    res.status(200).json(response);
    logger.debug("Exiting GetMemberByHandleController successfully", {
      requestId,
    });

  } catch (error) {
    logger.error("Error in GetMemberByHandleController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberHandle,
      requestId,
    });

    const errorResponse: MemberLookupErrorResponse = {
      message: "Internal server error while retrieving member information",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error"
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    logger.debug("Exiting GetMemberByHandleController with error", {
      requestId,
    });
    next(error);
  }
};
