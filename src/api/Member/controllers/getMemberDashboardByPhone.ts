import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";

/**
 * Controller for retrieving a member's dashboard by phone number
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

    if (!phone) {
      logger.warn("GetMemberDashboardByPhoneController called with empty phone number", { requestId });
      res.status(400).json({ message: "Phone number is required" });
      logger.debug("Exiting GetMemberDashboardByPhoneController due to missing phone number", { requestId });
      return;
    }

    logger.info("Retrieving member dashboard by phone", { phone, requestId });

    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard", { phone, requestId });
      res.status(404).json({ message: "Could not retrieve member dashboard" });
      logger.debug("Exiting GetMemberDashboardByPhoneController due to missing member dashboard", { requestId });
      return;
    }

    logger.debug("Retrieving account dashboards", { memberID: memberDashboard.memberID, accountCount: memberDashboard.accountIDS.length, requestId });
    const accountDashboards = await Promise.all(
      memberDashboard.accountIDS.map(async (accountId: string) => {
        return GetAccountDashboardService(memberDashboard.memberID, accountId);
      })
    );

    logger.info("Member dashboard and account dashboards retrieved successfully", { 
      phone, 
      memberID: memberDashboard.memberID, 
      accountCount: accountDashboards.length,
      requestId
    });
    res.status(200).json({ memberDashboard, accountDashboards });
    logger.debug("Exiting GetMemberDashboardByPhoneController successfully", { requestId });
  } catch (error) {
    logger.error("Error in GetMemberDashboardByPhoneController", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      phone: req.body.phone,
      requestId
    });
    logger.debug("Exiting GetMemberDashboardByPhoneController with error", { requestId });
    next(error);
  }
}
