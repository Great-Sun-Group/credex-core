import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface OnboardResponse {
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
        token: string;
        defaultAccountID: string;
      };
    };
    dashboard: {
      memberTier: number;
      remainingAvailableUSD: number;
      accounts: any[]; // Will be typed when dashboard is standardized
    };
  };
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

    if (!memberResult.success || !memberResult.data) {
      throw new MemberError(
        memberResult.message || "Failed to create member",
        "MEMBER_CREATE_FAILED",
        400
      );
    }

    const memberData = memberResult.data; // Assign to variable to satisfy TypeScript

    // Create default account
    logger.debug("Creating default account", {
      memberID: memberData.memberID,
      requestId
    });

    const accountResult = await CreateAccountService(
      memberData.memberID,
      "PERSONAL",
      `${firstname} ${lastname} Personal`,
      phone,
      defaultDenom,
      null,
      null
    );

    if (!accountResult.success || !accountResult.data) {
      throw new MemberError(
        "Failed to create default account: " + accountResult.message,
        "ACCOUNT_CREATE_FAILED"
      );
    }

    // Generate and store token
    const token = generateToken(memberData.memberID);
    const session = searchSpaceDriver.session();
    
    try {
      await session.executeWrite(async (tx) => {
        return tx.run(
          "MATCH (m:Member {memberID: $memberID}) SET m.token = $token",
          { 
            memberID: memberData.memberID,
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
    
    if (!dashboardResult.success || !dashboardResult.data) {
      throw new MemberError(
        "Failed to retrieve initial dashboard",
        "DASHBOARD_RETRIEVAL_FAILED"
      );
    }

    const dashboardData = dashboardResult.data; // Assign to variable to satisfy TypeScript

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

    logger.info("Member onboarded successfully", {
      memberID: memberData.memberID,
      accountID: accountResult.data.accountID,
      accountCount: validAccountDashboards.length,
      requestId
    });

    // Return standardized response
    const response: OnboardResponse = {
      message: `${firstname} ${lastname}: Personal account created with a default denomination of ${defaultDenom}.`,
      data: {
        action: {
          id: memberData.memberID,
          type: "MEMBER_ONBOARDED",
          timestamp: new Date().toISOString(),
          actor: memberData.memberID,
          details: {
            memberID: memberData.memberID,
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            memberHandle: memberData.phone, // Using phone as handle per current implementation
            defaultDenom: memberData.defaultDenom,
            token,
            defaultAccountID: accountResult.data.accountID
          }
        },
        dashboard: {
          memberTier: dashboardData.memberTier,
          remainingAvailableUSD: dashboardData.remainingAvailableUSD,
          accounts: validAccountDashboards
        }
      }
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

    const statusCode = 
      handledError.message.includes("already in use") ? 409 :
      handledError.message.includes("Invalid") ? 400 :
      handledError.message.includes("not found") ? 404 :
      handledError.statusCode || 500;

    res.status(statusCode).json({
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: "MEMBER_ONBOARD_FAILED",
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
    logger.debug("Exiting OnboardMemberController", { requestId });
  }
}
