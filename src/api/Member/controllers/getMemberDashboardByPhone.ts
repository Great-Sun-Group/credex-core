import express from "express";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { GetAccountDashboardController } from "../../Account/controllers/getAccountDashboard";
import logger from "../../../../config/logger";
import { validatePhone } from "../../../utils/validators";

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
) {
  const { phone } = req.body;

  try {
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ message: "phone is required and must be a string" });
      return;
    }

    // Validate phone number format using the validatePhone function
    if (!validatePhone(phone)) {
      res.status(400).json({
        message: "Invalid phone number format. Please provide a valid international phone number.",
      });
      return;
    }

    logger.info("Retrieving member dashboard by phone", { phone });

    const memberDashboard = await GetMemberDashboardByPhoneService(phone);
    if (!memberDashboard) {
      logger.warn("Could not retrieve member dashboard", { phone });
      res.status(404).json({ message: "Could not retrieve member dashboard" });
      return;
    }

    const accountDashboards = await Promise.all(
      memberDashboard.accountIDS.map(async (accountId: string) => {
        const accountReq = {
          body: {
            memberID: memberDashboard.memberID,
            accountID: accountId
          }
        } as express.Request;
        const accountRes = {
          status: (code: number) => ({
            json: (data: any) => data
          })
        } as express.Response;

        return GetAccountDashboardController(accountReq, accountRes);
      })
    );

    logger.info("Member dashboard retrieved successfully", { phone, memberID: memberDashboard.memberID });
    res.status(200).json({ memberDashboard, accountDashboards });
  } catch (error) {
    logger.error("Error in GetMemberDashboardByPhoneController", { error, phone });
    next(error);
  }
}
