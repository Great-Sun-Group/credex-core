import { GetAccountDashboardService } from "../api/Account/services/GetAccountDashboard";
import { AccountRepository } from "../api/Account/repositories/AccountRepository";
import { BalanceRepository } from "../api/Account/repositories/BalanceRepository";
import { MemberDashboardService } from "../api/Member/services/MemberDashboardService";
import { MemberRepository } from "../api/Member/repositories/MemberRepository";
import { SpendLimitService } from "../api/Member/services/SpendLimitService";
import { AccountInternalDashboardService, accountInternalDashboardService } from "../api/AccountInternal/services/AccountInternalDashboardService";
import logger from "./logger";

// Initialize repositories and services
const accountRepo = new AccountRepository();
const balanceRepo = BalanceRepository.getInstance();
const memberRepo = new MemberRepository();
const spendLimitService = new SpendLimitService();
const accountDashboardService = new GetAccountDashboardService(accountRepo, balanceRepo);
export const memberDashboardService = new MemberDashboardService(memberRepo, spendLimitService);

// Types for standardized dashboard response
interface StandardizedDashboardData {
  member: Awaited<ReturnType<typeof MemberDashboardService.prototype.getMemberDashboardData>>;
  accounts: NonNullable<Awaited<ReturnType<typeof GetAccountDashboardService.prototype.getDashboard>>['data']>[];
  accountsInternal?: Awaited<ReturnType<typeof AccountInternalDashboardService.prototype.getAccountInternalDashboardData>>;
}

/**
 * Helper function to compose a response with standardized dashboard data.
 * This ensures consistent dashboard handling across all endpoints.
 *
 * @param memberID - ID of the member requesting the dashboard
 * @param accountID - ID of the account to get dashboard for
 * @param requestId - Request tracking ID
 * @param customMemberDashboardService - Optional custom instance of MemberDashboardService
 * @returns Standardized dashboard data or empty object if fetch fails
 */
export async function getDashboardData(
  memberID: string,
  accountID: string,
  requestId: string,
  customMemberDashboardService?: MemberDashboardService
): Promise<Partial<StandardizedDashboardData>> {
  try {
    logger.debug("Fetching dashboard data", { memberID, accountID, requestId });

    const [memberData, accountResult, accountsInternal] = await Promise.all([
      (customMemberDashboardService || memberDashboardService).getMemberDashboardData(memberID),
      accountDashboardService.getDashboard(memberID, accountID),
      accountInternalDashboardService.getAccountInternalDashboardData(memberID).catch(err => {
        logger.warn("Failed to fetch internal accounts", {
          memberID,
          error: err instanceof Error ? err.message : "Unknown error",
          requestId,
        });
        return [];
      })
    ]);

    if (!accountResult.success || !accountResult.data) {
      logger.warn("Failed to fetch account dashboard data", {
        memberID,
        accountID,
        message: accountResult.message,
        requestId,
      });
      return { 
        member: memberData,
        accountsInternal
      };
    }

    return {
      member: memberData,
      accounts: [accountResult.data],
      accountsInternal
    };
  } catch (error) {
    logger.error("Error fetching dashboard data", {
      error: error instanceof Error ? error.message : "Unknown error",
      memberID,
      accountID,
      requestId,
    });
    return {};
  }
}

/**
 * Helper function to compose a standard API response with standardized dashboard data.
 *
 * @param baseResponse - The base response without dashboard data
 * @param memberID - ID of the member requesting the dashboard
 * @param accountID - ID of the account to get dashboard for
 * @param requestId - Request tracking ID
 * @param customMemberDashboardService - Optional custom instance of MemberDashboardService
 * @returns The complete response with standardized dashboard data
 */
export async function withDashboard<T>(
  baseResponse: {
    message: string;
    data: {
      action: {
        id: string | null;
        type: string;
        timestamp: string;
        actor: string;
        details: T;
      };
    };
  },
  memberID: string,
  accountID: string,
  requestId: string,
  customMemberDashboardService?: MemberDashboardService
): Promise<{
  message: string;
  data: {
    action: {
      id: string | null;
      type: string;
      timestamp: string;
      actor: string;
      details: T;
    };
    dashboard: Partial<StandardizedDashboardData>;
  };
}> {
  const dashboard = await getDashboardData(
    memberID,
    accountID,
    requestId,
    customMemberDashboardService
  );

  return {
    ...baseResponse,
    data: {
      ...baseResponse.data,
      dashboard,
    },
  };
}
