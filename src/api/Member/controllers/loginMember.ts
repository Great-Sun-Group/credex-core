import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    memberID: string;
  };
  message: string;
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
    } else {
      logger.info("Login successful", {
        phone,
        memberID: result.data?.memberID,
        requestId
      });
    }

    return result;

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in LoginMemberController", {
      error: handledError.message,
      code: handledError.code,
      phone,
      requestId
    });
    
    return {
      success: false,
      message: handledError.message
    };
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
        success: false,
        message: "Phone number is required"
      });
      return;
    }

    const result = await LoginMemberController(phone, requestId);

    if (!result.success) {
      const statusCode = result.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json(result);
    } else {
      res.status(200).json(result);
    }

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Unexpected error in loginMemberExpressHandler", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });
    
    next(handledError);
  } finally {
    logger.debug("Exiting loginMemberExpressHandler", { requestId });
  }
}
