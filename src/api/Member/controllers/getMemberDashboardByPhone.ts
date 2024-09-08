import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import logger from "../../../../config/logger";
import { getMemberDashboardByPhoneSchema } from "../validators/memberSchemas";

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
  try {
    const { error, value } = getMemberDashboardByPhoneSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { phone } = value;

    logger.info("Retrieving member dashboard by phone", { phone });

    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard", { phone });
      res.status(404).json({ message: "Could not retrieve member dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      memberDashboard.accountIDS.map(async (accountId: string) => {
        return GetAccountDashboardService(memberDashboard.memberID, accountId);
      })
    );

    logger.info("Member dashboard retrieved successfully", { phone, memberID: memberDashboard.memberID });
    res.status(200).json({ memberDashboard, accountDashboards });
  } catch (error) {
    logger.error("Error in GetMemberDashboardByPhoneController", { error: (error as Error).message, phone: req.body.phone });
    next(error);
  }
}
