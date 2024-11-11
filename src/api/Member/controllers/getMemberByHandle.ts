import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";
import logger from "../../../utils/logger";
import { validateHandle } from "../../../utils/validators";

interface MemberResponse {
  message: string;
  data: {
    action: {
      id: string;
      type: string;
      timestamp: string;
      actor: string;
      details: {
        memberID: string;
        memberName: string;
        memberHandle: string;
      };
    };
  };
}

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
      res.status(400).json({
        message: "Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.",
        data: {
          action: {
            id: null,
            type: "MEMBER_LOOKUP_FAILED",
            timestamp: new Date().toISOString(),
            actor: null,
            details: {
              reason: "INVALID_HANDLE",
              memberHandle,
              validationError: handleValidation.message
            }
          }
        }
      });
      return;
    }

    logger.info("Retrieving member by handle", { memberHandle, requestId });

    const memberData = await GetMemberByHandleService(memberHandle);

    if (memberData) {
      logger.info("Member retrieved successfully", {
        memberHandle,
        memberID: memberData.memberID,
        requestId,
      });

      const response: MemberResponse = {
        message: `Found member: ${memberData.memberName}`,
        data: {
          action: {
            id: memberData.memberID,
            type: "MEMBER_FOUND",
            timestamp: new Date().toISOString(),
            actor: memberData.memberID,
            details: {
              memberID: memberData.memberID,
              memberName: memberData.memberName,
              memberHandle
            }
          }
        }
      };

      res.status(200).json(response);
    } else {
      logger.info("Member not found", { memberHandle, requestId });
      res.status(404).json({
        message: "Member not found",
        data: {
          action: {
            id: null,
            type: "MEMBER_LOOKUP_FAILED",
            timestamp: new Date().toISOString(),
            actor: null,
            details: {
              reason: "NOT_FOUND",
              memberHandle
            }
          }
        }
      });
    }

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

    res.status(500).json({
      message: "Internal server error",
      data: {
        action: {
          id: null,
          type: "MEMBER_LOOKUP_FAILED",
          timestamp: new Date().toISOString(),
          actor: null,
          details: {
            reason: "INTERNAL_ERROR",
            error: error instanceof Error ? error.message : "Unknown error",
            memberHandle
          }
        }
      }
    });

    logger.debug("Exiting GetMemberByHandleController with error", {
      requestId,
    });
  }
};
