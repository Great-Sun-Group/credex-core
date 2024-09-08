import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../../config/logger";

export async function UnauthorizeForCompanyService(
  memberIDtoBeUnauthorized: string,
  accountID: string,
  ownerID: string
) {
  logger.debug("UnauthorizeForCompanyService called", { memberIDtoBeUnauthorized, accountID, ownerID });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query to unauthorize account");
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (memberToUnauthorize:Member { memberID: $memberIDtoBeUnauthorized })
                -[authRel:AUTHORIZED_FOR]->(account:Account { accountID: $accountID })
                <-[:OWNS]-(owner:Member { memberID: $ownerID })
            DELETE authRel
            RETURN
                account.accountID AS accountID,
                memberToUnauthorize.memberID AS memberToUnauthorize
        `,
      {
        memberIDtoBeUnauthorized,
        accountID,
        ownerID,
      }
    );

    if (!result.records.length) {
      logger.warn("Could not unauthorize account", { memberIDtoBeUnauthorized, accountID, ownerID });
      return false;
    }
    const record = result.records[0];

    logger.info("Account unauthorized successfully", {
      memberToUnauthorize: record.get("memberToUnauthorize"),
      accountID: record.get("accountID")
    });
    return true;
  } catch (error) {
    logger.error("Error unauthorizing account", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoBeUnauthorized, 
      accountID, 
      ownerID 
    });
    return false;
  } finally {
    logger.debug("Closing database session", { memberIDtoBeUnauthorized, accountID, ownerID });
    await ledgerSpaceSession.close();
  }
}
