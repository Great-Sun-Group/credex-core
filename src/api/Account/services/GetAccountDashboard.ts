import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { GetBalancesService } from "./GetBalances";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersIn";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOut";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface AuthorizedMember {
  memberID: string;
  firstname: string;
  lastname: string;
}

interface AccountDashboardData {
  accountID: string;
  accountName: string;
  accountHandle: string;
  defaultDenom: string;
  isOwnedAccount: boolean;
  sendOffersTo?: {
    memberID: string;
    firstname: string;
    lastname: string;
  };
  authFor: AuthorizedMember[];
  balanceData: any; // Will be typed when balances are standardized
  pendingInData: any; // Will be typed when Credex standardization is complete
  pendingOutData: any; // Will be typed when Credex standardization is complete
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
export async function GetAccountDashboardService(
  memberID: string,
  accountID: string
): Promise<DashboardResult> {
  logger.debug("Entering GetAccountDashboardService", { memberID, accountID });

  if (!memberID || !accountID) {
    throw new AccountError(
      "Member ID and Account ID are required",
      "MISSING_PARAMS",
      400
    );
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Get basic account information and authorization data
    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH
          (account:Account { accountID: $accountID })
          <-[:AUTHORIZED_FOR]-
          (member:Member { memberID: $memberID})
        MATCH
          (account)<-[:AUTHORIZED_FOR]-(allAuthMembers)
        OPTIONAL MATCH
          (account)<-[owns:OWNS]-(member)
        OPTIONAL MATCH
          (account)-[:SEND_OFFERS_TO]->(sendOffersTo:Member)
        RETURN
          account.accountID AS accountID,
          account.accountType AS accountType,
          account.accountName AS accountName,
          account.accountHandle AS accountHandle,
          account.defaultDenom AS defaultDenom,
          sendOffersTo.firstname AS sendOffersToFirstname,
          sendOffersTo.lastname AS sendOffersToLastname,
          sendOffersTo.memberID AS sendOffersToMemberID,
          owns IS NOT NULL AS isOwnedAccount,
          collect({
            memberID: allAuthMembers.memberID,
            firstname: allAuthMembers.firstname,
            lastname: allAuthMembers.lastname
          }) AS authorizedMembers
      `;

      const queryResult = await tx.run(query, { memberID, accountID });

      if (queryResult.records.length === 0) {
        throw new AccountError(
          "Account not found or access denied",
          "NOT_FOUND",
          404
        );
      }

      return queryResult.records[0];
    });

    // Construct the dashboard data
    const dashboardData: AccountDashboardData = {
      accountID: result.get("accountID"),
      accountName: result.get("accountName"),
      accountHandle: result.get("accountHandle"),
      defaultDenom: result.get("defaultDenom"),
      isOwnedAccount: result.get("isOwnedAccount"),
      authFor: result.get("authorizedMembers"),
      balanceData: [],
      pendingInData: [],
      pendingOutData: [],
    };

    // Add send offers to information if available
    if (result.get("sendOffersToMemberID")) {
      dashboardData.sendOffersTo = {
        memberID: result.get("sendOffersToMemberID"),
        firstname: result.get("sendOffersToFirstname"),
        lastname: result.get("sendOffersToLastname"),
      };
    }

    // Get additional dashboard components
    logger.debug("Fetching additional dashboard components", { accountID });

    const [balanceData, pendingInData, pendingOutData] = await Promise.all([
      GetBalancesService(accountID),
      GetPendingOffersInService(accountID),
      GetPendingOffersOutService(accountID),
    ]);

    dashboardData.balanceData = balanceData;
    dashboardData.pendingInData = pendingInData;
    dashboardData.pendingOutData = pendingOutData;

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

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetAccountDashboardService", { memberID, accountID });
  }
}
