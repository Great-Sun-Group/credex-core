import { AccountInternalData, accountInternalRepository } from "../repositories/AccountInternalRepository";
import logger from "../../../utils/logger";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";

export interface IAccountInternalDashboardService {
  getAccountInternalDashboardData(memberID: string): Promise<AccountInternalData[]>;
}

export class AccountInternalDashboardService implements IAccountInternalDashboardService {
  constructor(private readonly accountInternalRepo = accountInternalRepository) {}

  /**
   * Retrieves all internal accounts for a member for dashboard display
   * @param memberID - UUID of the member
   * @returns Array of internal account data
   * @throws AccountError if retrieval fails
   */
  async getAccountInternalDashboardData(memberID: string): Promise<AccountInternalData[]> {
    try {
      logger.debug("Retrieving internal account dashboard data", { memberID });

      // Get internal accounts from repository
      const internalAccounts = await this.accountInternalRepo.findByMemberId(memberID);
      
      logger.debug("Retrieved internal accounts", { 
        memberID, 
        count: internalAccounts.length 
      });

      return internalAccounts;
    } catch (error) {
      logger.error("Error in getAccountInternalDashboardData", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID
      });

      if (error instanceof AccountError) {
        throw error;
      }

      throw new AccountError(
        'Error retrieving internal account dashboard data',
        'INTERNAL_ERROR',
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }
}

// Create a singleton instance for use across the application
export const accountInternalDashboardService = new AccountInternalDashboardService();
