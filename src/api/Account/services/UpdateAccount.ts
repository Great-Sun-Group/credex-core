import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
import logger from "../../../utils/logger";

export async function UpdateAccountService(
  ownerID: string,
  accountID: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string
) {
  logger.debug("UpdateAccountService called", {
    ownerID,
    accountID,
    accountName,
    accountHandle,
    defaultDenom,
  });

  // Validation: Check defaultDenom in denominations
  if (!getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    logger.warn(message, { defaultDenom });
    return false;
  }

  const dataToUpdate = {
    accountName: accountName,
    accountHandle: accountHandle,
    defaultDenom: defaultDenom,
  };

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query to update account", {
      ownerID,
      accountID,
    });
    const result = await ledgerSpaceSession.run(
      `
        MATCH
          (owner:Member { memberID: $ownerID })
          -[:OWNS]->
          (account:Account { accountID: $accountID })
        SET account += $dataToUpdate
        RETURN account.accountID AS accountID
            `,
      { ownerID, accountID, dataToUpdate }
    );

    if (!result.records[0].get("accountID")) {
      logger.warn("Account not found or update failed", { ownerID, accountID });
      return false;
    }

    const updatedAccountID = result.records[0].get("accountID");
    logger.info("Account updated successfully", { updatedAccountID, ownerID });
    return updatedAccountID;
  } catch (error) {
    logger.error("Error updating account data", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      ownerID,
      accountID,
    });
    return null;
  } finally {
    logger.debug("Closing database session", { ownerID, accountID });
    await ledgerSpaceSession.close();
  }
}
