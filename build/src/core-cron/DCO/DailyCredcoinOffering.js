"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyCredcoinOffering = DailyCredcoinOffering;
const neo4j_1 = require("../../../config/neo4j");
const DBinitialization_1 = require("./DBinitialization");
const DCOexecute_1 = require("./DCOexecute");
const DCOavatars_1 = require("./DCOavatars");
const logger_1 = require("../../utils/logger");
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function checks for an active daynode, initializes the database if necessary,
 * and runs the DCO execution and avatar update processes.
 *
 * @returns {Promise<boolean>} Returns true if the DCO process completes successfully, false otherwise.
 */
async function DailyCredcoinOffering() {
    (0, logger_1.logInfo)("Starting Daily Credcoin Offering process");
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        // Check for active daynode
        const daynodeExists = await checkActiveDaynode(ledgerSpaceSession);
        if (!daynodeExists) {
            (0, logger_1.logInfo)("No active daynode found. Initializing database...");
            await (0, DBinitialization_1.DBinitialization)();
            (0, logger_1.logInfo)("Database initialization complete");
        }
        await (0, DCOexecute_1.DCOexecute)();
        await (0, DCOavatars_1.DCOavatars)();
        return true;
    }
    catch (error) {
        (0, logger_1.logError)("Error in DailyCredcoinOffering", error);
        return false;
    }
    finally {
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
async function checkActiveDaynode(session) {
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
async function resetDCORunningFlag(session) {
    (0, logger_1.logInfo)("Resetting DCOrunningNow flag");
    await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = false
  `);
}
//# sourceMappingURL=DailyCredcoinOffering.js.map