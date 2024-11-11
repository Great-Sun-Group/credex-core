import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
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

type DashboardDetails = MemberActionDetails & {
  memberID: string;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
  remainingAvailableUSD: number;
};

type DashboardResponse = TypedApiResponse<DashboardDetails>;
type DashboardErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetMemberDashboardByPhoneController
 * 
 * Retrieves a member's dashboard and associated account information.
 * Includes member details, account dashboards, and transaction limits.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetMemberDashboardByPhoneController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetMemberDashboardByPhoneController", { requestId });

  try {
    const { phone } = req.body;

    // Validate phone number
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      logger.warn("Invalid phone number", { phone, requestId });
      
      const errorResponse: DashboardErrorResponse = {
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

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Retrieving member dashboard", { phone, requestId });

    // Get member dashboard
    const memberDashboardResult = await GetMemberDashboardByPhoneService(phone);

    if (!memberDashboardResult.success || !memberDashboardResult.data) {
      const statusCode = 
        memberDashboardResult.error?.code === "NOT_FOUND" ? 404 :
        memberDashboardResult.error?.code === "MISSING_PHONE" ? 400 :
        500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      logger.warn("Failed to retrieve member dashboard", {
        phone,
        error: memberDashboardResult.error,
        message: memberDashboardResult.message,
        requestId
      });

      const errorResponse: DashboardErrorResponse = {
        message: memberDashboardResult.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: memberDashboardResult.error?.code || "RETRIEVAL_ERROR",
              reason: memberDashboardResult.error?.details || memberDashboardResult.message
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    const dashboardData = memberDashboardResult.data;

    // Get associated account dashboards
    logger.debug("Retrieving account dashboards", {
      memberID: dashboardData.memberID,
      accountCount: dashboardData.accountIDS.length,
      requestId,
    });

    const accountDashboards = await Promise.all(
      dashboardData.accountIDS.map(async (accountId: string) => {
        try {
          return await GetAccountDashboardService(
            dashboardData.memberID,
            accountId
          );
        } catch (error) {
          logger.error("Error fetching account dashboard", {
            error: error instanceof Error ? error.message : "Unknown error",
            accountId,
            memberID: dashboardData.memberID,
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

    logger.info("Dashboard data retrieved successfully", {
      memberID: dashboardData.memberID,
      accountCount: validAccountDashboards.length,
      requestId,
    });

    // Return standardized response
    const response: DashboardResponse = {
      message: "Dashboard retrieved successfully",
      data: {
        action: {
          id: dashboardData.memberID,
          type: ApiActionType.DASHBOARD_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: dashboardData.memberID,
          details: {
            memberID: dashboardData.memberID,
            firstname: dashboardData.firstname,
            lastname: dashboardData.lastname,
            memberHandle: dashboardData.memberHandle,
            defaultDenom: dashboardData.defaultDenom,
            memberTier: dashboardData.memberTier,
            remainingAvailableUSD: dashboardData.remainingAvailableUSD
          }
        },
        dashboard: {
          memberTier: dashboardData.memberTier,
          remainingAvailableUSD: dashboardData.remainingAvailableUSD,
          accounts: validAccountDashboards
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in GetMemberDashboardByPhoneController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      phone: req.body.phone,
      requestId,
    });

    const errorResponse: DashboardErrorResponse = {
      message: "Failed to retrieve dashboard",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
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
    logger.debug("Exiting GetMemberDashboardByPhoneController", { requestId });
  }
}
