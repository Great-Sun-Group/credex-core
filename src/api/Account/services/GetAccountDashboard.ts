import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersIn";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOut";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import { IAccountRepository } from "../repositories/AccountRepository";
import { IBalanceRepository } from "../repositories/BalanceRepository";
import logger from "../../../utils/logger";

// Import types from pending offers services
interface OfferedCredex {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  dueDate?: string;
  secured?: boolean;
}

interface AuthorizedMember {
  memberID: string;
  firstname: string;
  lastname: string;
}

// Types based on dashboardSwaggerTemplate.ts
interface AccountDashboardData {
  accountID: string;
  accountName: string;
  accountHandle: string;
  accountType: 'PERSONAL' | 'TRUST' | 'OPERATIONS';
  defaultDenom: 'CXX' | 'CAD' | 'USD' | 'XAU';
  isOwnedAccount: boolean;
  sendOffersTo?: {
    memberID: string;
    firstname: string;
    lastname: string;
  };
  balanceData: {
    securedNetBalancesByDenom: string[];
    unsecuredBalancesInDefaultDenom: {
      totalPayables: string;
      totalReceivables: string;
      netPayRec: string;
    };
    netCredexAssetsInDefaultDenom: string;
  };
  pendingInData: OfferedCredex[];
  pendingOutData: OfferedCredex[];
  // Trust account specific fields
  subtype?: 'BANK' | 'VAULT';
  denomination?: 'CXX' | 'CAD' | 'USD' | 'XAU';
  bankFields?: {
    jurisdiction: string;
    accountNumber: string;
    branchCode?: string;
    bankCode?: string;
    routingNumber?: string;
    transitNumber?: string;
  };
}

interface DashboardResult {
  success: boolean;
  data?: AccountDashboardData;
  message: string;
}

/**
 * GetAccountDashboardService
 * 
 * Retrieves comprehensive dashboard information for an account including
 * balances, authorized members, and pending offers.
 * 
 * @param memberID - ID of the member requesting the dashboard
 * @param accountID - ID of the account to retrieve dashboard for
 * @returns DashboardResult containing account dashboard data
 * @throws AccountError for validation and business logic errors
 */
export class GetAccountDashboardService {
  constructor(
    private readonly accountRepo: IAccountRepository,
    private readonly balanceRepo: IBalanceRepository
  ) {}

  /**
   * Get complete account dashboard data
   * @param memberID - UUID of the requesting member
   * @param accountID - UUID of the account
   * @returns Dashboard result with standardized data
   */
  async getDashboard(
    memberID: string,
    accountID: string
  ): Promise<DashboardResult> {
  const requestId = `acct_dash_${Date.now()}`; // Generate a request ID
  logger.debug("Entering GetAccountDashboardService", { memberID, accountID, requestId });

  if (!memberID || !accountID) {
    throw new AccountError(
      "Member ID and Account ID are required",
      "MISSING_PARAMS",
      400
    );
  }

    try {
      // Get account data from optimized repository
      const accountData = await this.accountRepo.findByIdWithAccess(accountID, memberID);
      if (!accountData) {
        logger.warn("Account not found or access denied", { accountID, memberID });
        return {
          success: false,
          message: "Account not found or access denied"
        };
      }

      // Construct the standardized dashboard data
      const dashboardData: AccountDashboardData = {
        accountID: accountData.accountID,
        accountName: accountData.accountName,
        accountHandle: accountData.accountHandle,
        accountType: accountData.accountType,
        defaultDenom: accountData.defaultDenom,
        isOwnedAccount: accountData.isOwnedAccount,
        sendOffersTo: accountData.sendOffersTo,
        // Add trust-specific fields if present
        ...(accountData.subtype && { subtype: accountData.subtype }),
        ...(accountData.defaultDenom && { denomination: accountData.defaultDenom }),
        ...(accountData.bankFields && { bankFields: accountData.bankFields }),
        balanceData: {
          securedNetBalancesByDenom: [],
          unsecuredBalancesInDefaultDenom: {
            totalPayables: "0.00",
            totalReceivables: "0.00",
            netPayRec: "0.00"
          },
          netCredexAssetsInDefaultDenom: "0.00"
        },
        pendingInData: [],
        pendingOutData: [],
      };

      // Get balance data from optimized repository
      try {
        dashboardData.balanceData = await this.balanceRepo.getBalances(accountID);
      } catch (error) {
        logger.error("Failed to retrieve balance data", {
          error: error instanceof Error ? error.message : "Unknown error",
          accountID,
          memberID
        });
        // Keep default empty balance data structure
      }

      // Get pending offers data
      try {
        const [pendingInResult, pendingOutResult] = await Promise.all([
          GetPendingOffersInService(accountID),
          GetPendingOffersOutService(accountID),
        ]);

        if (pendingInResult.success && pendingInResult.data) {
          dashboardData.pendingInData = pendingInResult.data;
        }
        if (pendingOutResult.success && pendingOutResult.data) {
          dashboardData.pendingOutData = pendingOutResult.data;
        }
      } catch (error) {
        logger.error("Failed to retrieve pending offers", {
          error: error instanceof Error ? error.message : "Unknown error",
          accountID,
          memberID
        });
        // Keep default empty arrays
      }

      logger.info("Account dashboard retrieved successfully", {
        accountID,
        memberID,
        isOwned: dashboardData.isOwnedAccount
      });

      return {
        success: true,
        data: dashboardData,
        message: "Dashboard retrieved successfully"
      };

    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in GetAccountDashboardService", {
        error: handledError.message,
        code: handledError.code,
        memberID,
        accountID
      });

      return {
        success: false,
        message: handledError.message
      };
    }
  }
}
