import { GetAccountDashboardService } from "./GetAccountDashboard";
import { AccountRepository } from "../repositories/AccountRepository";
import { BalanceRepository } from "../repositories/BalanceRepository";
import logger from "../../../utils/logger";

/**
 * Enhanced account dashboard service that extends the original dashboard service
 * with additional functionality.
 * 
 * This service uses the original GetAccountDashboardService class internally
 * and will be extended with additional features in the future.
 * 
 * @param accountID - The ID of the account to retrieve dashboard information for
 * @param memberID - The ID of the member requesting the dashboard
 * @returns Dashboard result with the same structure as the original service
 */
export async function GetAccountDashboardFullService(
  accountID: string,
  memberID: string
): Promise<any> {
  logger.debug("GetAccountDashboardFullService called", { accountID, memberID });

  try {
    // Initialize repositories
    const accountRepo = new AccountRepository();
    const balanceRepo = BalanceRepository.getInstance();
    
    // Use the original dashboard service
    const dashboardService = new GetAccountDashboardService(accountRepo, balanceRepo);
    const dashboardResult = await dashboardService.getDashboard(memberID, accountID);
    
    // TODO: Add additional data and processing here
    // This is where we'll extend the functionality in the future
    
    return dashboardResult;
  } catch (error) {
    logger.error("Error in GetAccountDashboardFullService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      memberID,
    });
    
    return {
      success: false,
      message: "Failed to retrieve enhanced account dashboard information",
      error: {
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}
