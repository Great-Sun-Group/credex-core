import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
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

interface DashboardData {
  memberTier: number;
  remainingAvailableUSD: number;
  accounts: any[]; // Will be typed when dashboard is standardized
}

/**
 * LoginMemberController
 * 
 * Handles member authentication via phone number.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
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

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      logger.warn("Invalid phone number format", { phone, requestId });
      const response: LoginErrorResponse = {
        message: phoneValidation.message || "Invalid phone number format",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_PHONE",
              reason: phoneValidation.message || "Invalid phone number format",
              field: "phone"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Attempting to login member", { phone, requestId });
    const result = await LoginMemberService(phone);

    if (!result.success || !result.data) {
      logger.warn("Login failed", {
        phone,
        message: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("Invalid") ? 400 :
        401;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_UNAUTHORIZED;

      const response: LoginErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: statusCode === 404 ? "NOT_FOUND" :
                    statusCode === 400 ? "INVALID_PHONE" :
                    "LOGIN_FAILED",
              reason: result.message
            }
          },
          dashboard: {}
        }
      };
      res.status(statusCode).json(response);
      return;
    }

    // Get associated account dashboards
    logger.debug("Retrieving account dashboards", {
      memberID: result.data.memberID,
      accountCount: result.data.accountIDS.length,
      requestId,
    });

    const accountDashboards = await Promise.all(
      result.data.accountIDS.map(async (accountId: string) => {
        try {
          return await GetAccountDashboardService(
            result.data!.memberID,
            accountId
          );
        } catch (error) {
          logger.error("Error fetching account dashboard", {
            error: error instanceof Error ? error.message : "Unknown error",
            accountId,
            memberID: result.data!.memberID,
            requestId
          });
          return null;
        }
      })
    );

    // Filter out any failed account dashboard retrievals
    const validAccountDashboards = accountDashboards.filter(
      (dashboard): dashboard is NonNullable<typeof dashboard> => dashboard !== null
    );

    const response: LoginResponse = {
      message: "Successfully logged in",
      data: {
        action: {
          id: result.data.memberID,
          type: ApiActionType.MEMBER_LOGIN,
          timestamp: new Date().toISOString(),
          actor: result.data.memberID,
          details: {
            memberID: result.data.memberID,
            phone,
            token: result.data.token
          }
        },
        dashboard: {
          memberTier: result.data.memberTier,
          remainingAvailableUSD: result.data.remainingAvailableUSD,
          accounts: validAccountDashboards
        }
      }
    };

    logger.info("Login successful", {
      memberID: result.data.memberID,
      phone,
      accountCount: validAccountDashboards.length,
      requestId
    });

    res.status(200).json(response);

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
