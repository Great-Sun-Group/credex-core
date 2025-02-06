import express from "express";
import { LoginMemberService } from "../services/LoginMember";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";
import { getDashboardData, memberDashboardService } from "../../../utils/dashboardUtils";
import {
  TypedApiResponse,
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";

// Define specific response types for login
type LoginDetails = MemberActionDetails & {
  token?: string;
};

type LoginResponse = TypedApiResponse<LoginDetails>;
type LoginErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * LoginMemberV2Controller
 *
 * Handles member authentication via phone number and password.
 * This is specifically for mobile app authentication.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function loginMemberV2ExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering loginMemberV2ExpressHandler", {
    requestId,
    body: req.body,
  });

  try {
    const { phone, password } = req.body;

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
              field: "phone",
            },
          },
          dashboard: {},
        },
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
              field: "phone",
            },
          },
          dashboard: {},
        },
      };
      res.status(400).json(response);
      return;
    }

    logger.info("Attempting to login member with password", { 
      phone,
      requestId 
    });
    const result = await LoginMemberService({ phone, password });

    if (!result.success || !result.data) {
      logger.warn("Login failed", {
        phone,
        message: result.message,
        requestId,
      });

      let statusCode = 401; // Default to unauthorized
      let errorType = ApiActionType.ERROR_UNAUTHORIZED;
      let errorCode = result.error?.code || "LOGIN_FAILED";

      if (result.message.includes("not found")) {
        statusCode = 404;
        errorType = ApiActionType.ERROR_NOT_FOUND;
        errorCode = "NOT_FOUND";
      } else if (result.message.includes("Invalid")) {
        statusCode = 401; // Keep 401 for invalid credentials
        errorType = ApiActionType.ERROR_UNAUTHORIZED;
        errorCode = "INVALID_CREDENTIALS";
      } else if (result.error?.code === "PASSWORD_REQUIRED") {
        statusCode = 401;
        errorType = ApiActionType.ERROR_UNAUTHORIZED;
      }

      const response: LoginErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: errorCode,
              reason: result.message,
            },
          },
          dashboard: {},
        },
      };
      res.status(statusCode).json(response);
      return;
    }

    // Store the validated data
    const loginData = result.data;

    // Get standardized dashboard data for all accounts
    logger.debug("Retrieving dashboard data", {
      memberID: loginData.memberID,
      requestId,
    });

    const dashboardPromises = loginData.accountIDS.map(accountID => 
      getDashboardData(
        loginData.memberID,
        accountID,
        requestId,
        memberDashboardService
      )
    );

    const dashboards = await Promise.all(dashboardPromises);

    // Combine all account data into a single dashboard
    const dashboard = {
      member: dashboards[0].member, // Member data is same for all dashboards
      accounts: dashboards.flatMap(d => d.accounts || [])
    };

    const response: LoginResponse = {
      message: "Successfully logged in",
      data: {
        action: {
          id: loginData.memberID,
          type: ApiActionType.MEMBER_LOGIN,
          timestamp: new Date().toISOString(),
          actor: loginData.memberID,
          details: {
            memberID: loginData.memberID,
            phone,
            token: loginData.token,
            version: "v2",
            authMethod: "password"
          },
        },
        dashboard,
      },
    };

    logger.info("Login successful", {
      memberID: loginData.memberID,
      phone,
      hasDashboard: !!dashboard.member && !!dashboard.accounts?.[0],
      requestId,
    });

    res.status(200).json(response);
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Unexpected error in loginMemberV2ExpressHandler", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId,
    });

    const statusCode = handledError.message.includes("not found")
      ? 404
      : handledError.message.includes("Invalid")
        ? 400
        : handledError.statusCode || 500;

    const errorType =
      statusCode === 404
        ? ApiActionType.ERROR_NOT_FOUND
        : statusCode === 401
          ? ApiActionType.ERROR_UNAUTHORIZED
          : statusCode === 400
            ? ApiActionType.ERROR_VALIDATION
            : ApiActionType.ERROR_INTERNAL;

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
            reason: handledError.message,
          },
        },
        dashboard: {},
      },
    };
    res.status(statusCode).json(response);
  } finally {
    logger.debug("Exiting loginMemberV2ExpressHandler", { requestId });
  }
}
