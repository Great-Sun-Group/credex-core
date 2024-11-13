import { GetAccountDashboardService } from "../api/Account/services/GetAccountDashboard";
import logger from "./logger";

/**
 * Helper function to compose a response with dashboard data.
 * This ensures consistent dashboard handling across all endpoints.
 * 
 * @param memberID - ID of the member requesting the dashboard
 * @param accountID - ID of the account to get dashboard for
 * @param requestId - Request tracking ID
 * @returns Dashboard data or empty object if fetch fails
 */
export async function getDashboardData(
  memberID: string,
  accountID: string,
  requestId: string
): Promise<any> {
  try {
    logger.debug("Fetching dashboard data", { memberID, accountID, requestId });
    
    const dashboardResult = await GetAccountDashboardService(memberID, accountID);
    
    if (!dashboardResult.success) {
      logger.warn("Failed to fetch dashboard data", {
        memberID,
        accountID,
        message: dashboardResult.message,
        requestId
      });
      return {};
    }

    return dashboardResult.data || {};

  } catch (error) {
    logger.error("Error fetching dashboard data", {
      error: error instanceof Error ? error.message : "Unknown error",
      memberID,
      accountID,
      requestId
    });
    return {};
  }
}

/**
 * Helper function to compose a standard API response with dashboard data.
 * 
 * @param baseResponse - The base response without dashboard data
 * @param memberID - ID of the member requesting the dashboard
 * @param accountID - ID of the account to get dashboard for
 * @param requestId - Request tracking ID
 * @returns The complete response with dashboard data
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
  requestId: string
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
    dashboard: any;
  };
}> {
  const dashboard = await getDashboardData(memberID, accountID, requestId);

  return {
    ...baseResponse,
    data: {
      ...baseResponse.data,
      dashboard
    }
  };
}
