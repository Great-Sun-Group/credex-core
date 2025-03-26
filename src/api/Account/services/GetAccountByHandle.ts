import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface AccountDetails {
  accountID: string;
  accountName: string;
  accountHandle: string;
}

interface GetAccountResult {
  success: boolean;
  data?: AccountDetails;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetAccountByHandleService
 * 
 * Retrieves account information using the account handle.
 * Returns basic account details without sensitive information.
 * 
 * @param accountHandle - The unique handle of the account to retrieve
 * @returns GetAccountResult containing account details if found
 */
export async function GetAccountByHandleService(
  accountHandle: string
): Promise<GetAccountResult> {
  logger.debug("GetAccountByHandleService called", { accountHandle });

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!accountHandle) {
    logger.warn("GetAccountByHandleService called with empty accountHandle");
    return {
      success: false,
      message: "Account handle is required",
      error: {
        code: "MISSING_HANDLE",
        details: "Account handle cannot be empty"
      }
    };
  }

  try {
    logger.debug("Executing database query", { accountHandle });
    const result = await ledgerSpaceSession.run(
      `
      MATCH (account:Account { accountHandle: $accountHandle })
      RETURN
        account.accountID AS accountID,
        account.accountName AS accountName,
        account.accountHandle AS accountHandle
      `,
      { accountHandle }
    );

    if (!result.records.length) {
      logger.warn("Account not found in database", { accountHandle });
      return {
        success: false,
        message: `No account found with handle: ${accountHandle}`,
        error: {
          code: "ACCOUNT_NOT_FOUND",
          details: "The specified account handle does not exist"
        }
      };
    }

    const record = result.records[0];
    const accountDetails: AccountDetails = {
      accountID: record.get("accountID"),
      accountName: record.get("accountName"),
      accountHandle: record.get("accountHandle")
    };

    logger.info("Account retrieved from database", { 
      accountID: accountDetails.accountID, 
      accountHandle 
    });

    return {
      success: true,
      data: accountDetails,
      message: "Account found successfully"
    };

  } catch (error) {
    logger.error("Error fetching account data from database", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountHandle,
    });

    return {
      success: false,
      message: "Failed to retrieve account information",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred"
      }
    };

  } finally {
    logger.debug("Closing database session", { accountHandle });
    await ledgerSpaceSession.close();
  }
}
