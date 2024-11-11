import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";

interface DashboardResponse {
  message: string;
  data: {
    action: {
      id: string;
      type: string;
      timestamp: string;
      actor: string;
      details: {
        memberID: string;
        firstname: string;
        lastname: string;
        memberHandle: string;
        defaultDenom: string;
      };
    };
    dashboard: {
      memberTier: number;
      remainingAvailableUSD: number;
      accounts: any[]; // Type will be refined when AccountDashboard is standardized
    };
  };
}

/**
 * GetMemberDashboardByPhoneController
 * 
 * Retrieves a member's dashboard and associated account information.
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
      throw new MemberError(
        phoneValidation.message || "Invalid phone number format",
        "INVALID_PHONE",
        400
      );
    }

    logger.info("Retrieving member dashboard", { phone, requestId });

    // Get member dashboard
    const memberDashboardResult = await GetMemberDashboardByPhoneService(phone);

    if (!memberDashboardResult.success || !memberDashboardResult.data) {
      const statusCode = 
        memberDashboardResult.message.includes("not found") ? 404 : 400;

      logger.warn("Failed to retrieve member dashboard", {
        phone,
        message: memberDashboardResult.message,
        requestId
      });

      res.status(statusCode).json({
        message: memberDashboardResult.message,
        data: {
          action: {
            id: null,
            type: "DASHBOARD_RETRIEVAL_FAILED",
            timestamp: new Date().toISOString(),
            actor: null,
            details: {
              reason: statusCode === 404 ? "MEMBER_NOT_FOUND" : "RETRIEVAL_ERROR",
              phone
            }
          }
        }
      });
      return;
    }

    const dashboardData = memberDashboardResult.data; // Assign to variable to satisfy TypeScript

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
          type: "DASHBOARD_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: dashboardData.memberID,
          details: {
            memberID: dashboardData.memberID,
            firstname: dashboardData.firstname,
            lastname: dashboardData.lastname,
            memberHandle: dashboardData.memberHandle,
            defaultDenom: dashboardData.defaultDenom
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

    const statusCode = handledError.statusCode || 500;

    res.status(statusCode).json({
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: "DASHBOARD_RETRIEVAL_FAILED",
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
    logger.debug("Exiting GetMemberDashboardByPhoneController", { requestId });
  }
}
