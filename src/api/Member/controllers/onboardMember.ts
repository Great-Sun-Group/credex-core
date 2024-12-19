import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { LoginMemberService } from "../services/LoginMember";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { MemberDashboardService } from "../services/MemberDashboardService";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import { generateToken } from "../../../../config/authenticate";
import { getDashboardData } from "../../../utils/dashboardUtils";
import logger from "../../../utils/logger";
import {
  TypedApiResponse,
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";

import { MemberRepository } from "../repositories/MemberRepository";
import { SpendLimitService } from "../services/SpendLimitService";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);

type OnboardDetails = MemberActionDetails & {
  memberID: string;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  token: string;
  defaultAccountID: string;
};

type OnboardResponse = TypedApiResponse<OnboardDetails>;
type OnboardErrorResponse = TypedApiResponse<ErrorActionDetails>;

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
      requestId,
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
      logger.warn("Failed to create member", {
        error: memberResult.error,
        message: memberResult.message,
        requestId,
      });

      const statusCode =
        memberResult.error?.code === "DUPLICATE_PHONE"
          ? 409
          : memberResult.error?.code === "DUPLICATE_HANDLE"
            ? 409
            : memberResult.error?.code === "INVALID_DENOMINATION"
              ? 400
              : memberResult.error?.code === "MISSING_PARAMS"
                ? 400
                : 500;

      const errorType =
        statusCode === 409
          ? ApiActionType.ERROR_VALIDATION
          : statusCode === 400
            ? ApiActionType.ERROR_VALIDATION
            : ApiActionType.ERROR_INTERNAL;

      const errorResponse: OnboardErrorResponse = {
        message: memberResult.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: memberResult.error?.code || "UNKNOWN_ERROR",
              reason: memberResult.error?.details || memberResult.message,
            },
          },
          dashboard: {},
        },
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    const memberData = memberResult.data;

    // Create default account
    logger.debug("Creating default account", {
      memberID: memberData.memberID,
      requestId,
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
      logger.error("Failed to create default account", {
        error: accountResult.error,
        message: accountResult.message,
        memberID: memberData.memberID,
        requestId,
      });

      const errorResponse: OnboardErrorResponse = {
        message: "Failed to create default account",
        data: {
          action: {
            id: memberData.memberID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberData.memberID,
            details: {
              code: "ACCOUNT_CREATE_FAILED",
              reason:
                accountResult.message || "Failed to create default account",
            },
          },
          dashboard: {},
        },
      };

      res.status(500).json(errorResponse);
      return;
    }

    // Get initial dashboard data using LoginMemberService
    logger.debug("Retrieving initial dashboard data", {
      phone,
      requestId,
    });

    const dashboardResult = await LoginMemberService(phone);

    if (!dashboardResult.success || !dashboardResult.data) {
      logger.error("Failed to retrieve initial dashboard", {
        error: dashboardResult.error?.code,
        details: dashboardResult.error?.details,
        message: dashboardResult.message,
        memberID: memberData.memberID,
        requestId,
      });

      const errorResponse: OnboardErrorResponse = {
        message: "Member created but failed to retrieve dashboard",
        data: {
          action: {
            id: memberData.memberID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberData.memberID,
            details: {
              code: dashboardResult.error?.code || "DASHBOARD_RETRIEVAL_FAILED",
              reason: dashboardResult.error?.details || dashboardResult.message,
            },
          },
          dashboard: {},
        },
      };

      res.status(500).json(errorResponse);
      return;
    }

    // Get standardized dashboard data for all accounts
    logger.debug("Retrieving dashboard data", {
      memberID: memberData.memberID,
      accountIDS: dashboardResult.data.accountIDS,
      requestId,
    });

    const dashboardPromises = dashboardResult.data.accountIDS.map(accountID => 
      getDashboardData(
        memberData.memberID,
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

    logger.info("Member onboarded successfully", {
      memberID: memberData.memberID,
      accountID: accountResult.data.accountID,
      hasDashboard: !!dashboard.member && !!dashboard.accounts?.[0],
      requestId,
    });

    // Return standardized response
    const response: OnboardResponse = {
      message: `${firstname} ${lastname}: Personal account created with a default denomination of ${defaultDenom}.`,
      data: {
        action: {
          id: memberData.memberID,
          type: ApiActionType.MEMBER_ONBOARDED,
          timestamp: new Date().toISOString(),
          actor: memberData.memberID,
          details: {
            memberID: memberData.memberID,
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            memberHandle: memberData.memberHandle,
            defaultDenom: memberData.defaultDenom,
            token: dashboardResult.data.token,
            defaultAccountID: accountResult.data.accountID,
          },
        },
        dashboard,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Unexpected error in OnboardMemberController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId,
    });

    const errorResponse: OnboardErrorResponse = {
      message: "Failed to onboard member",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: handledError.code || "INTERNAL_ERROR",
            reason: handledError.message,
          },
        },
        dashboard: {},
      },
    };

    res.status(500).json(errorResponse);
    next(handledError);
  } finally {
    logger.debug("Exiting OnboardMemberController", { requestId });
  }
}
