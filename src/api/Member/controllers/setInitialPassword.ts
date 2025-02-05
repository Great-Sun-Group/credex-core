import express from "express";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { passwordService } from "../services/PasswordService";
import { generateToken } from "../../../../config/authenticate";
import {
  TypedApiResponse,
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";

type SetPasswordDetails = MemberActionDetails & {
  token?: string;
};

type SetPasswordResponse = TypedApiResponse<SetPasswordDetails>;
type SetPasswordErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * SetInitialPasswordController
 * 
 * Handles setting the initial password for members transitioning from WhatsApp to mobile app.
 * Requires phone-only authentication first.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function setInitialPasswordExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering setInitialPasswordExpressHandler", {
    requestId,
    body: req.body,
  });

  try {
    const { phone, password } = req.body;

    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
      // Find member and check if password already set
      const memberResult = await ledgerSpaceSession.executeRead(async (tx) => {
        const result = await tx.run(
          `
          MATCH (m:Member {phone: $phone})
          RETURN m.memberID as memberID, m.passwordHash as passwordHash
          `,
          { phone }
        );
        return result.records[0];
      });

      if (!memberResult) {
        logger.warn("Member not found", { phone, requestId });
        const response: SetPasswordErrorResponse = {
          message: "Member not found",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: "NOT_FOUND",
                reason: "No member exists with the provided phone number",
              },
            },
            dashboard: {},
          },
        };
        res.status(404).json(response);
        return;
      }

      const memberID = memberResult.get("memberID");
      const existingPasswordHash = memberResult.get("passwordHash");

      if (existingPasswordHash) {
        logger.warn("Password already set", { memberID, requestId });
        const response: SetPasswordErrorResponse = {
          message: "Password already set",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: "PASSWORD_EXISTS",
                reason: "Member already has a password set. Use password update endpoint to change password.",
              },
            },
            dashboard: {},
          },
        };
        res.status(400).json(response);
        return;
      }

      // Validate and hash new password
      const validation = passwordService.validatePassword(password);
      if (!validation.isValid) {
        logger.warn("Invalid password format", { memberID, requestId });
        const response: SetPasswordErrorResponse = {
          message: validation.errors?.join(", ") || "Invalid password format",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: "INVALID_PASSWORD",
                reason: validation.errors?.join(", ") || "Invalid password format",
              },
            },
            dashboard: {},
          },
        };
        res.status(400).json(response);
        return;
      }

      const { hash: passwordHash } = await passwordService.hashPassword(password);

      // Update member with password hash
      await ledgerSpaceSession.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (m:Member {memberID: $memberID})
          SET 
            m.passwordHash = $passwordHash,
            m.passwordLastChanged = datetime()
          `,
          { memberID, passwordHash }
        );
      });

      // Generate new token with password auth
      const token = generateToken(memberID, {
        version: 'v2',
        authMethod: 'password'
      });

      const response: SetPasswordResponse = {
        message: "Password set successfully",
        data: {
          action: {
            id: memberID,
            type: ApiActionType.MEMBER_UPDATE,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              memberID,
              phone,
              token,
              version: "v2",
              authMethod: "password"
            },
          },
          dashboard: {},
        },
      };

      logger.info("Initial password set successfully", {
        memberID,
        requestId,
      });

      res.status(200).json(response);
    } finally {
      await ledgerSpaceSession.close();
    }
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in setInitialPasswordExpressHandler", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId,
    });

    const response: SetPasswordErrorResponse = {
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: handledError.code || "UNKNOWN_ERROR",
            reason: handledError.message,
          },
        },
        dashboard: {},
      },
    };
    res.status(500).json(response);
  } finally {
    logger.debug("Exiting setInitialPasswordExpressHandler", { requestId });
  }
}
