import { ledgerSpaceDriver } from "../../../config/neo4j";
import { DBinitialization } from "./DBinitialization/index";
import { DCOexecute } from "./DCOexecute/index";
import { DCOavatars } from "./DCOavatars/index";
import logger from "../../utils/logger";

/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function checks for an active daynode, initializes the database if necessary,
 * and runs the DCO execution and avatar update processes.
 *
 * @returns {Promise<{ success: boolean, error?: string }>} Returns an object indicating success and any error message.
 */
export async function DailyCredcoinOffering(): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.info("Starting Daily Credcoin Offering process");
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check for active daynode
    logger.debug("Checking for active daynode");
    const daynodeExists = await checkActiveDaynode(ledgerSpaceSession);

    if (!daynodeExists) {
      logger.info("No active daynode found. Initializing database...");
      await DBinitialization();
      logger.info("Database initialization complete");
    } else {
      logger.debug("Active daynode found");
    }

    logger.debug("Starting DCO execution");
    await DCOexecute();
    logger.debug("DCO execution completed");

    logger.debug("Starting DCO avatars update");
    await DCOavatars();
    logger.debug("DCO avatars update completed");

    logger.info("Daily Credcoin Offering process completed successfully");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error in DailyCredcoinOffering", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: errorMessage };
  } finally {
    logger.debug("Resetting DCOrunningNow flag");
    await resetDCORunningFlag(ledgerSpaceSession);
    await ledgerSpaceSession.close();
    logger.debug("LedgerSpace session closed");
  }
}

/**
 * Checks if an active daynode exists in the database.
 *
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 * @returns {Promise<boolean>} Returns true if an active daynode exists, false otherwise.
 */
async function checkActiveDaynode(session: any): Promise<boolean> {
  logger.debug("Executing query to check for active daynode");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN daynode IS NOT NULL AS activeDaynodeExists
  `);
  
  if (!result.records || result.records.length === 0) {
    logger.debug("No records found, assuming no active daynode exists");
    return false;
  }
  
  const activeDaynodeExists = result.records[0].get("activeDaynodeExists");
  logger.debug(`Active daynode exists: ${activeDaynodeExists}`);
  return activeDaynodeExists === true;
}

/**
 * Resets the DCOrunningNow flag on the active daynode.
 *
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 */
async function resetDCORunningFlag(session: any): Promise<void> {
  logger.debug("Resetting DCOrunningNow flag");
  await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = false
  `);
  logger.debug("DCOrunningNow flag reset completed");
}
