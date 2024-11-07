import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
import logger from "../../../utils/logger";

export async function UpdateAccountService(
  ownerID: string,
  accountID: string,
  accountName: string | undefined,
  accountHandle: string | undefined,
  defaultDenom: string | undefined,
  DCOgiveInCXX?: number,
  DCOdenom?: string
) {
  logger.debug("UpdateAccountService called", {
    ownerID,
    accountID,
    accountName,
    accountHandle,
    defaultDenom,
    DCOgiveInCXX,
    DCOdenom,
  });

  // Validation: Check defaultDenom in denominations if provided
  if (defaultDenom && !getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    logger.warn(message, { defaultDenom });
    return false;
  }

  // Validation: Check DCOdenom in denominations if provided
  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    const message = "DCOdenom not in denoms";
    logger.warn(message, { DCOdenom });
    return false;
  }

  const dataToUpdate: Record<string, any> = {};

  // Only include fields that are provided
  if (accountName !== undefined) dataToUpdate.accountName = accountName;
  if (accountHandle !== undefined) dataToUpdate.accountHandle = accountHandle;
  if (defaultDenom !== undefined) dataToUpdate.defaultDenom = defaultDenom;
  if (DCOgiveInCXX !== undefined) dataToUpdate.DCOgiveInCXX = DCOgiveInCXX;
  if (DCOdenom !== undefined) dataToUpdate.DCOdenom = DCOdenom;

  // If no fields to update, return early
  if (Object.keys(dataToUpdate).length === 0) {
    logger.warn("No fields provided for update", { accountID });
    return false;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query to update account", {
      ownerID,
      accountID,
      dataToUpdate,
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

    if (!result.records[0]?.get("accountID")) {
      logger.warn("Account not found or update failed", { ownerID, accountID });
      return false;
    }

    const updatedAccountID = result.records[0].get("accountID");
    logger.info("Account updated successfully", {
      updatedAccountID,
      ownerID,
      dataToUpdate,
    });
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
