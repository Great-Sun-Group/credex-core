import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface OnboardResponse {
  success: boolean;
  data?: {
    memberDashboard: any; // Will be typed when dashboard is standardized
    token: string;
    defaultAccountID: string;
  };
  message: string;
}

/**
 * OnboardMemberController
 * 
 * Handles member onboarding process including:
 * - Creating new member
 * - Creating default account
 * - Generating authentication token
 * - Retrieving initial dashboard
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function OnboardMemberController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering OnboardMemberController", { requestId });

  try {
    const { firstname, lastname, phone, defaultDenom } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Onboarding new member", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    });

    // Create member
    const memberResult = await OnboardMemberService(
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    );

    // Create default account
    logger.debug("Creating default account", {
      memberID: memberResult.data?.memberID,
      requestId
    });

    const accountResult = await CreateAccountService(
      memberResult.data!.memberID,
      "PERSONAL_CONSUMPTION",
      `${firstname} ${lastname} Personal`,
      phone,
      defaultDenom,
      null,
      null
    );

    if (!accountResult.success) {
      throw new MemberError(
        "Failed to create default account: " + accountResult.message,
        "ACCOUNT_CREATE_FAILED"
      );
    }

    // Generate and store token
    const token = generateToken(memberResult.data!.memberID);
    const session = searchSpaceDriver.session();
    
    try {
      await session.executeWrite(async (tx) => {
        return tx.run(
          "MATCH (m:Member {memberID: $memberID}) SET m.token = $token",
          { 
            memberID: memberResult.data!.memberID,
            token 
          }
        );
      });
    } finally {
      await session.close();
    }

    // Get initial dashboard
    logger.debug("Retrieving initial dashboard", {
      phone,
      requestId
    });

    const dashboardResult = await GetMemberDashboardByPhoneService(phone);
    
    if (!dashboardResult) {
      throw new MemberError(
        "Failed to retrieve initial dashboard",
        "DASHBOARD_RETRIEVAL_FAILED"
      );
    }

    logger.info("Member onboarded successfully", {
      memberID: memberResult.data?.memberID,
      accountID: accountResult.data?.accountID,
      requestId
    });

    const response: OnboardResponse = {
      success: true,
      data: {
        memberDashboard: dashboardResult,
        token,
        defaultAccountID: accountResult.data!.accountID
      },
      message: "Member onboarded successfully"
    };

    res.status(201).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in OnboardMemberController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    if (handledError instanceof MemberError) {
      const statusCode = 
        handledError.message.includes("already in use") ? 409 :
        handledError.message.includes("Invalid") ? 400 :
        handledError.message.includes("not found") ? 404 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting OnboardMemberController", { requestId });
  }
}
