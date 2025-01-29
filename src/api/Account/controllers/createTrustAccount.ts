import { Response, NextFunction } from "express";
import { CreateTrustAccountService } from "../services/CreateTrustAccount";
import { ApiActionType, TypedApiResponse, ErrorActionDetails } from "../../../types/apiResponse";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService } from "../../Member/services/SpendLimitService";
import { UserRequest } from "../../../types/auth";
import logger from "../../../utils/logger";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);

type CreateTrustAccountResponse = TypedApiResponse<{
  accountID: string;
  accountHandle: string;
  subtype: string;
  denomination: string;
}>;

type CreateTrustAccountErrorResponse = TypedApiResponse<ErrorActionDetails>;

export async function createTrustAccountController(
  req: UserRequest,
  res: Response,
  next: NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering createTrustAccountController", {
    requestId,
    body: req.body,
  });

  const {
    accountName,
    accountHandle,
    subtype,
    denomination,
    bankFields,
  } = req.body;

  // Get memberID from auth token
  const ownerID = req.user.memberID;

  try {
    // Create the trust account
    logger.info("Creating new trust account", {
      ownerID,
      accountName,
      subtype,
      requestId,
    });

    const result = await CreateTrustAccountService(
      ownerID,
      accountName,
      accountHandle,
      subtype,
      denomination,
      bankFields
    );

    if (!result.success || !result.data) {
      logger.warn("Failed to create trust account", {
        error: result.message,
        code: result.error?.code,
        requestId,
      });

      const errorResponse: CreateTrustAccountErrorResponse = {
        message: result.message || "Failed to create trust account",
        data: {
          action: {
            id: null,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            type: ApiActionType.ERROR_VALIDATION,
            details: {
              code: result.error?.code || "CREATE_FAILED",
              reason: result.message || "Failed to create trust account"
            },
          },
          dashboard: {},
        },
      };

      // Map error codes to appropriate status and action type
      switch (result.error?.code) {
        case "INSUFFICIENT_TIER":
          errorResponse.data.action.type = ApiActionType.ERROR_UNAUTHORIZED;
          return res.status(403).json(errorResponse);
        case "DB_ERROR":
        case "INTERNAL_ERROR":
          errorResponse.data.action.type = ApiActionType.ERROR_INTERNAL;
          errorResponse.data.action.details.suggestion = "Please try again or contact support if the issue persists";
          return res.status(500).json(errorResponse);
        default:
          return res.status(400).json(errorResponse);
      }
    }

    // Fetch updated standardized dashboard data
    logger.debug("Fetching updated dashboard data", {
      ownerID,
      requestId,
    });

    const dashboard = await getDashboardData(
      ownerID,
      result.data.accountID,
      req.id || "",
      memberDashboardService
    );

    const successResponse: CreateTrustAccountResponse = {
      message: result.message,
      data: {
        action: {
          id: result.data.accountID,
          type: ApiActionType.TRUST_ACCOUNT_CREATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID: result.data.accountID,
            accountHandle,
            subtype,
            denomination
          },
        },
        dashboard,
      },
    };

    logger.info("Trust account created successfully", {
      accountID: result.data.accountID,
      ownerID,
      requestId,
    });

    return res.status(201).json(successResponse);
  } catch (error) {
    logger.error("Unexpected error in createTrustAccountController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: CreateTrustAccountErrorResponse = {
      message: "An unexpected error occurred while creating the trust account",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion:
              "Please try again or contact support if the issue persists",
          },
        },
        dashboard: {},
      },
    };

    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting createTrustAccountController", { requestId });
  }
}
