import { AccountInternalData, accountInternalRepository } from "../repositories/AccountInternalRepository";
import logger from "../../../utils/logger";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import { getProfilePictureUrls } from "../../../services/assetUrlService";

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

      // Fetch profile picture thumbnails for each account
      const accountsWithPictures = await Promise.all(
        internalAccounts.map(async (account) => {
          try {
            const profilePicUrls = await getProfilePictureUrls(account.accountID, 'AccountInternal').catch(err => {
              logger.warn("Failed to fetch profile picture URLs for internal account", {
                accountID: account.accountID,
                error: err instanceof Error ? err.message : "Unknown error"
              });
              return null;
            });

            return {
              ...account,
              profilePictureThumbnail: profilePicUrls?.thumbnail
            };
          } catch (error) {
            logger.warn("Error getting profile picture for internal account", {
              accountID: account.accountID,
              error: error instanceof Error ? error.message : "Unknown error"
            });
            return account;
          }
        })
      );

      return accountsWithPictures;
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
