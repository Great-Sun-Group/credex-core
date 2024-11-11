import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";

interface LoginResponse {
  message: string;
  data: {
    action: {
      id: string;
      type: string;
      timestamp: string;
      actor: string;
      details: {
        token?: string;
      };
    };
    dashboard?: any; // Will be populated when dashboard standardization is complete
  };
}

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

    return {
      message: "Successfully logged in",
      data: {
        action: {
          id: result.data!.memberID,
          type: "MEMBER_LOGIN",
          timestamp: new Date().toISOString(),
          actor: result.data!.memberID,
          details: {
            token: result.data!.token
          }
        }
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
      res.status(400).json({
        message: "Phone number is required",
        data: {
          action: {
            id: null,
            type: "MEMBER_LOGIN_FAILED",
            timestamp: new Date().toISOString(),
            actor: null,
            details: {
              reason: "MISSING_PHONE"
            }
          }
        }
      });
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

    res.status(statusCode).json({
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: "MEMBER_LOGIN_FAILED",
          timestamp: new Date().toISOString(),
          actor: null,
          details: {
            reason: handledError.code,
            error: handledError.message
          }
        }
      }
    });
  } finally {
    logger.debug("Exiting loginMemberExpressHandler", { requestId });
  }
}
