import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validatePhone } from "../../../utils/validators";

interface DashboardResponse {
  success: boolean;
  data?: {
    memberDashboard: {
      memberID: string;
      firstname: string;
      lastname: string;
      memberHandle: string;
      defaultDenom: string;
      memberTier: number;
      remainingAvailableUSD: number;
      accountIDS: string[];
    };
    accountDashboards: any[]; // Type will be refined when AccountDashboard is standardized
  };
  message: string;
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

      res.status(statusCode).json(memberDashboardResult);
      return;
    }

    // Get associated account dashboards
    logger.debug("Retrieving account dashboards", {
      memberID: memberDashboardResult.data.memberID,
      accountCount: memberDashboardResult.data.accountIDS.length,
      requestId,
    });

    const accountDashboards = await Promise.all(
      memberDashboardResult.data.accountIDS.map(async (accountId: string) => {
        try {
          return await GetAccountDashboardService(
            memberDashboardResult.data!.memberID,
            accountId
          );
        } catch (error) {
          logger.error("Error fetching account dashboard", {
            error: error instanceof Error ? error.message : "Unknown error",
            accountId,
            memberID: memberDashboardResult.data!.memberID,
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
      memberID: memberDashboardResult.data.memberID,
      accountCount: validAccountDashboards.length,
      requestId,
    });

    const response: DashboardResponse = {
      success: true,
      data: {
        memberDashboard: memberDashboardResult.data,
        accountDashboards: validAccountDashboards
      },
      message: "Dashboard retrieved successfully"
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

    if (handledError instanceof MemberError) {
      res.status(handledError.statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);
  } finally {
    logger.debug("Exiting GetMemberDashboardByPhoneController", { requestId });
  }
}
