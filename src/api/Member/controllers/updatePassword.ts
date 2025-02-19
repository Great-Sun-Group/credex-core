import express from "express";
import { passwordService } from "../services/PasswordService";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { handleServiceError } from "../../../utils/errorUtils";
import { TypedApiResponse, ApiActionType, ErrorActionDetails } from "../../../types/apiResponse";
import { UserRequest, isUserRequest } from "../../../types/auth";

interface UpdatePasswordDetails {
  memberID: string;
  timestamp: string;
}

type UpdatePasswordResponse = TypedApiResponse<UpdatePasswordDetails>;
type UpdatePasswordErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * UpdatePasswordController
 * 
 * Handles password updates for members. Validates current password,
 * ensures new password meets requirements, and updates the stored hash.
 * 
 * @param req - Express request object containing current and new passwords
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UpdatePasswordController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  
  if (!isUserRequest(req)) {
    logger.error("Invalid user request", { requestId });
    return next(new Error("Invalid user request"));
  }

  const memberID = req.user.memberID;
  
  logger.debug("Entering UpdatePasswordController", { requestId, memberID });

  try {
    const { currentPassword, newPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword) {
      const errorResponse: UpdatePasswordErrorResponse = {
        message: "Missing required parameters",
        data: {
          action: {
            id: memberID || null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID || "system",
            details: {
              code: "MISSING_PARAMS",
              reason: "Current password and new password are required"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
      // Get current password hash
      const result = await ledgerSpaceSession.run(
        `MATCH (m:Member {memberID: $memberID}) 
         RETURN m.passwordHash as passwordHash`,
        { memberID }
      );

      if (result.records.length === 0) {
        const errorResponse: UpdatePasswordErrorResponse = {
          message: "Member not found",
          data: {
            action: {
              id: memberID || null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: memberID || "system",
              details: {
                code: "MEMBER_NOT_FOUND",
                reason: "Unable to find member record"
              }
            },
            dashboard: {}
          }
        };
        res.status(404).json(errorResponse);
        return;
      }

      const currentHash = result.records[0].get("passwordHash");

      // Let PasswordService handle all validations
      const { hash: newHash } = await passwordService.updatePassword(
        currentPassword,
        newPassword,
        currentHash
      );

      // Update password hash in database
      await ledgerSpaceSession.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (m:Member {memberID: $memberID})
           SET m.passwordHash = $newHash,
               m.passwordLastChanged = datetime()`,
          { memberID, newHash }
        );
      });

      logger.info("Password updated successfully", { memberID, requestId });

      const response: UpdatePasswordResponse = {
        message: "Password updated successfully",
        data: {
          action: {
            id: memberID,
            type: ApiActionType.MEMBER_PASSWORD_UPDATED,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              memberID,
              timestamp: new Date().toISOString()
            }
          },
          dashboard: {}
        }
      };

      res.status(200).json(response);
    } finally {
      await ledgerSpaceSession.close();
    }
  } catch (error) {
    const handledError = handleServiceError(error);
    
    logger.error("Error in UpdatePasswordController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberID,
      requestId
    });

    // Handle specific password-related errors
    if (error instanceof Error) {
      if (error.message.includes("Password must") || error.message === "New password must be different from current password") {
        const errorResponse: UpdatePasswordErrorResponse = {
          message: error.message,
          data: {
            action: {
              id: memberID || null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: memberID || "system",
              details: {
                code: "INVALID_NEW_PASSWORD",
                reason: error.message
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (error.message === "Current password is incorrect") {
        const errorResponse: UpdatePasswordErrorResponse = {
          message: "Current password is incorrect",
          data: {
            action: {
              id: memberID || null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: memberID || "system",
              details: {
                code: "INVALID_CURRENT_PASSWORD",
                reason: "The provided current password is incorrect"
              }
            },
            dashboard: {}
          }
        };
        res.status(401).json(errorResponse);
        return;
      }
    }

    // Generic error response
    const errorResponse: UpdatePasswordErrorResponse = {
      message: "Failed to update password",
      data: {
        action: {
          id: memberID || null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID || "system",
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
    logger.debug("Exiting UpdatePasswordController", { requestId, memberID });
  }
}
