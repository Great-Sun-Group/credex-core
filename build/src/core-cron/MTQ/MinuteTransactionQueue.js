"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinuteTransactionQueue = MinuteTransactionQueue;
const neo4j_1 = require("../../../config/neo4j");
const LoopFinder_1 = require("./LoopFinder");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = require("../../utils/logger");
async function MinuteTransactionQueue() {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const searchSpaceSession = neo4j_1.searchSpaceDriver.session();
    (0, logger_1.logInfo)("MTQ start: checking if DCO or MTQ is in progress");
    try {
        const { DCOflag, MTQflag } = await checkDCOAndMTQStatus(ledgerSpaceSession);
        if (DCOflag === null || MTQflag === null) {
            (0, logger_1.logWarning)("No active daynode found. Skipping MTQ.");
            return false;
        }
        if (DCOflag || MTQflag) {
            if (DCOflag)
                (0, logger_1.logInfo)("DCO in progress, holding MTQ");
            if (MTQflag)
                (0, logger_1.logInfo)("MTQ already in progress, holding new MTQ");
            return false;
        }
        (0, logger_1.logInfo)("Running MTQ");
        await setMTQRunningFlag(ledgerSpaceSession, true);
        const BAIL_TIME = 14 * 60 * 1000; // 14 minutes
        const bailTimer = setTimeout(() => {
            (0, logger_1.logWarning)("Bail timer reached");
            return true;
        }, BAIL_TIME);
        try {
            await processQueuedAccounts(ledgerSpaceSession, searchSpaceSession);
            await processQueuedCredexes(ledgerSpaceSession, searchSpaceSession);
        }
        finally {
            clearTimeout(bailTimer);
            await setMTQRunningFlag(ledgerSpaceSession, false);
        }
        (0, logger_1.logInfo)("MTQ processing completed");
        return true;
    }
    catch (error) {
        (0, logger_1.logError)("Error in MinuteTransactionQueue", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
        await searchSpaceSession.close();
    }
}
async function checkDCOAndMTQStatus(session) {
    const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN
      daynode.DCOrunningNow AS DCOflag,
      daynode.MTQrunningNow AS MTQflag
  `);
    if (result.records.length === 0) {
        (0, logger_1.logWarning)("No active daynode found");
        return { DCOflag: null, MTQflag: null };
    }
    return {
        DCOflag: result.records[0].get("DCOflag"),
        MTQflag: result.records[0].get("MTQflag"),
    };
}
async function setMTQRunningFlag(session, value) {
    const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    SET daynode.MTQrunningNow = $value
    RETURN daynode
  `, { value });
    if (result.records.length === 0) {
        (0, logger_1.logWarning)("No active daynode found when setting MTQ running flag");
    }
}
async function processQueuedAccounts(ledgerSpaceSession, searchSpaceSession) {
    const queuedAccounts = await getQueuedAccounts(ledgerSpaceSession);
    for (const account of queuedAccounts) {
        try {
            await createAccountInSearchSpace(searchSpaceSession, account);
            await markAccountAsProcessed(ledgerSpaceSession, account.accountID);
            (0, logger_1.logInfo)(`Account created in searchSpace: ${account.accountName}`);
        }
        catch (error) {
            (0, logger_1.logError)(`Error processing account ${account.accountName}`, error);
        }
    }
}
async function getQueuedAccounts(session) {
    const result = await session.run(`
    MATCH (newAccount:Account {queueStatus: "PENDING_ACCOUNT"})
    RETURN
      newAccount.accountID AS accountID,
      newAccount.accountName AS accountName
  `);
    return result.records.map((record) => ({
        accountID: record.get("accountID"),
        accountName: record.get("accountName"),
    }));
}
async function createAccountInSearchSpace(session, account) {
    const result = await session.run(`
    CREATE (newAccount:Account)
    SET newAccount = $account
    RETURN newAccount.accountID AS accountID
    `, { account });
    if (result.records.length === 0) {
        throw new Error(`Failed to create account in searchSpace: ${account.accountName}`);
    }
}
async function markAccountAsProcessed(session, accountID) {
    await session.run(`
    MATCH (processedAccount:Account {accountID: $accountID})
    SET processedAccount.queueStatus = "PROCESSED"
    `, { accountID });
}
async function processQueuedCredexes(ledgerSpaceSession, searchSpaceSession) {
    const queuedCredexes = await getQueuedCredexes(ledgerSpaceSession);
    const sortedQueuedCredexes = lodash_1.default.sortBy(queuedCredexes, "acceptedAt");
    for (const credex of sortedQueuedCredexes) {
        try {
            await (0, LoopFinder_1.LoopFinder)(credex.issuerAccountID, credex.credexID, credex.amount, credex.denomination, credex.CXXmultiplier, credex.credexSecuredDenom, credex.dueDate, credex.acceptorAccountID);
        }
        catch (error) {
            (0, logger_1.logError)(`Error processing credex ${credex.credexID}`, error);
        }
    }
}
async function getQueuedCredexes(session) {
    const result = await session.run(`
    MATCH
      (issuerAccount:Account)
      -[:OWES]->(queuedCredex:Credex {queueStatus: "PENDING_CREDEX"})
      -[:OWES]->(acceptorAccount:Account)
    OPTIONAL MATCH (queuedCredex)<-[:SECURES]-(securer:Account)
    RETURN queuedCredex.acceptedAt AS acceptedAt,
           issuerAccount.accountID AS issuerAccountID,
           acceptorAccount.accountID AS acceptorAccountID,
           securer.accountID AS securerID,
           queuedCredex.credexID AS credexID,
           queuedCredex.InitialAmount AS amount,
           queuedCredex.Denomination AS denomination,
           queuedCredex.CXXmultiplier AS CXXmultiplier,
           queuedCredex.dueDate AS dueDate
  `);
    return result.records.map((record) => ({
        acceptedAt: record.get("acceptedAt"),
        issuerAccountID: record.get("issuerAccountID"),
        acceptorAccountID: record.get("acceptorAccountID"),
        credexID: record.get("credexID"),
        amount: record.get("amount").toNumber(),
        denomination: record.get("denomination"),
        CXXmultiplier: record.get("CXXmultiplier").toNumber(),
        credexSecuredDenom: record.get("securerID") !== null
            ? record.get("denomination")
            : "floating",
        dueDate: record.get("dueDate"),
    }));
}
//# sourceMappingURL=MinuteTransactionQueue.js.map