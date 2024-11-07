import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export async function SetDCOparticipantRate(
  accountID: string,
  DCOgiveInCXX: number,
  DCOdenom: string
) {
  logger.debug("SetDCOparticipantRate called", { accountID, DCOgiveInCXX, DCOdenom });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Setting DCO participant rate in database", { accountID });
    const result = await ledgerSpaceSession.run(
      `
      MATCH (account:Account { accountID: $accountID })
      SET
        account.DCOgiveInCXX = $DCOgiveInCXX,
        account.DCOdenom = $DCOdenom,
        account.updatedAt = datetime()
      RETURN account
      `,
      { accountID, DCOgiveInCXX, DCOdenom }
    );

    if (!result.records.length) {
      logger.warn("No matching account found", { accountID });
      return {
        account: false,
        message: "No matching account found"
      };
    }

    const updatedAccount = result.records[0].get("account").properties;
    logger.info("DCO participant rate set successfully", {
      accountID,
      DCOgiveInCXX,
      DCOdenom
    });

    return {
      accountID: updatedAccount.accountID,
      message: "DCO participant rate set successfully"
    };

  } catch (error) {
    logger.error("Error setting DCO participant rate", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID
    });

    if (isNeo4jError(error)) {
      logger.warn("Neo4j error while setting DCO rate", {
        code: error.code,
        message: error.message
      });
      return {
        account: false,
        message: `Database error: ${error.message}`
      };
    }

    return {
      account: false,
      message: "Error: " + (error instanceof Error ? error.message : "Unknown error")
    };

  } finally {
    logger.debug("Closing database session", { accountID });
    await ledgerSpaceSession.close();
  }
}
