import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";
import { 
  TypedApiResponse, 
  ApiActionType, 
  MemberActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Define specific response types for login
type LoginDetails = MemberActionDetails & {
  token?: string;
};

type LoginResponse = TypedApiResponse<LoginDetails>;
type LoginErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * LoginMemberController
 * 
 * Handles member authentication via phone number.
 * 
 * @param phone - The member's phone number
 * @param requestId - Request tracking ID
 * @returns LoginResponse containing authentication result
 * @throws MemberError for validation and business logic errors
 */
export async function LoginMemberController(
  phone: string,
  requestId: string
): Promise<LoginResponse> {
  logger.debug("Entering LoginMemberController", { phone, requestId });

  try {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      throw new MemberError(
        phoneValidation.message || "Invalid phone number format",
        "INVALID_PHONE",
        400
      );
    }

    logger.info("Attempting to login member", { phone, requestId });
    const result = await LoginMemberService(phone);

    if (!result.success) {
      logger.warn("Login failed", {
        phone,
        message: result.message,
        requestId
      });
      throw new MemberError(result.message, "LOGIN_FAILED", 401);
    }

    logger.info("Login successful", {
      phone,
      memberID: result.data?.memberID,
      requestId
    });

    // Extract data with type safety
    const { memberID, token } = result.data!;

    return {
      message: "Successfully logged in",
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_LOGIN,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            phone,
            token
          }
        },
        dashboard: {} // Empty dashboard until standardization is complete
      }
    };

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in LoginMemberController", {
      error: handledError.message,
      code: handledError.code,
      phone,
      requestId
    });
    
    throw handledError;
  }
}

/**
 * Express handler for member login requests
 */
export async function loginMemberExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering loginMemberExpressHandler", {
    requestId,
    body: req.body
  });

  try {
    const { phone } = req.body;

    if (!phone) {
      logger.warn("Missing phone number", { requestId });
      const response: LoginErrorResponse = {
        message: "Phone number is required",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "MISSING_PHONE",
              reason: "Phone number is required",
              field: "phone"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(response);
      return;
    }

    const result = await LoginMemberController(phone, requestId);
    res.status(200).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Unexpected error in loginMemberExpressHandler", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });
    
    const statusCode = 
      handledError.message.includes("not found") ? 404 :
      handledError.message.includes("Invalid") ? 400 :
      handledError.statusCode || 500;

    const errorType = 
      statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
      statusCode === 401 ? ApiActionType.ERROR_UNAUTHORIZED :
      statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
      ApiActionType.ERROR_INTERNAL;

    const response: LoginErrorResponse = {
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: errorType,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: handledError.code || "UNKNOWN_ERROR",
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };
    res.status(statusCode).json(response);
  } finally {
    logger.debug("Exiting loginMemberExpressHandler", { requestId });
  }
}
