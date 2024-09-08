import { ledgerSpaceDriver } from "../../../config/neo4j";
import { DBinitialization } from "./DBinitialization";
import { DCOexecute } from "./DCOexecute";
import { DCOavatars } from "./DCOavatars";
import { logInfo, logError } from "../../utils/logger";

/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function checks for an active daynode, initializes the database if necessary,
 * and runs the DCO execution and avatar update processes.
 * 
 * @returns {Promise<boolean>} Returns true if the DCO process completes successfully, false otherwise.
 */
export async function DailyCredcoinOffering(): Promise<boolean> {
  logInfo("Starting Daily Credcoin Offering process");
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check for active daynode
    const daynodeExists = await checkActiveDaynode(ledgerSpaceSession);

    if (!daynodeExists) {
      logInfo("No active daynode found. Initializing database...");
      await DBinitialization();
      logInfo("Database initialization complete");
    }

    await DCOexecute();
    await DCOavatars();

    return true;
  } catch (error) {
    logError("Error in DailyCredcoinOffering", error as Error);
    return false;
  } finally {
    await resetDCORunningFlag(ledgerSpaceSession);
    await ledgerSpaceSession.close();
  }
}

/**
 * Checks if an active daynode exists in the database.
 * 
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 * @returns {Promise<boolean>} Returns true if an active daynode exists, false otherwise.
 */
async function checkActiveDaynode(session: any): Promise<boolean> {
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN daynode IS NOT NULL AS activeDaynodeExists
  `);
  return result.records[0].get("activeDaynodeExists");
}

/**
 * Resets the DCOrunningNow flag on the active daynode.
 * 
 * @param {Neo4jSession} session - The Neo4j session to use for the query.
 */
async function resetDCORunningFlag(session: any): Promise<void> {
  logInfo("Resetting DCOrunningNow flag");
  await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = false
  `);
}
