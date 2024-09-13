import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

export async function GetAccountByHandleService(
  accountHandle: string
): Promise<any | null> {
  logger.debug("GetAccountByHandleService called", { accountHandle });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!accountHandle) {
    logger.warn("GetAccountByHandleService called with empty accountHandle");
    return null;
  }

  try {
    logger.debug("Executing database query", { accountHandle });
    const result = await ledgerSpaceSession.run(
      `
            MATCH (account:Account { accountHandle: $accountHandle })
            RETURN
              account.accountID AS accountID,
              account.accountName AS accountName
        `,
      { accountHandle }
    );

    if (!result.records.length) {
      logger.info("Account not found", { accountHandle });
      return null;
    }

    const accountID = result.records[0].get("accountID");
    const accountName = result.records[0].get("accountName");

    logger.info("Account retrieved successfully", { accountID, accountHandle });
    return {
      accountID: accountID,
      accountName: accountName,
    };
  } catch (error) {
    logger.error("Error fetching account data", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountHandle,
    });
    return false;
  } finally {
    logger.debug("Closing database session", { accountHandle });
    await ledgerSpaceSession.close();
  }
}
