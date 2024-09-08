import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { LoopFinder } from "./LoopFinder";
import _ from "lodash";
import { logInfo, logWarning, logError } from "../../utils/logger";

interface Account {
  accountID: string;
  accountName: string;
}

interface Credex {
  acceptedAt: string;
  issuerAccountID: string;
  acceptorAccountID: string;
  credexID: string;
  amount: number;
  denomination: string;
  CXXmultiplier: number;
  credexSecuredDenom: string;
  dueDate: string;
}

export async function MinuteTransactionQueue(): Promise<boolean> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  logInfo("MTQ start: checking if DCO or MTQ is in progress");

  try {
    const { DCOflag, MTQflag } = await checkDCOAndMTQStatus(ledgerSpaceSession);

    if (DCOflag === null || MTQflag === null) {
      logWarning("No active daynode found. Skipping MTQ.");
      return false;
    }

    if (DCOflag || MTQflag) {
      if (DCOflag) logInfo("DCO in progress, holding MTQ");
      if (MTQflag) logInfo("MTQ already in progress, holding new MTQ");
      return false;
    }

    logInfo("Running MTQ");

    await setMTQRunningFlag(ledgerSpaceSession, true);

    const BAIL_TIME = 14 * 60 * 1000; // 14 minutes
    const bailTimer = setTimeout(() => {
      logWarning("Bail timer reached");
      return true;
    }, BAIL_TIME);

    try {
      await processQueuedAccounts(ledgerSpaceSession, searchSpaceSession);
      await processQueuedCredexes(ledgerSpaceSession, searchSpaceSession);
    } finally {
      clearTimeout(bailTimer);
      await setMTQRunningFlag(ledgerSpaceSession, false);
    }

    logInfo("MTQ processing completed");
    return true;
  } catch (error) {
    logError("Error in MinuteTransactionQueue", error as Error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

async function checkDCOAndMTQStatus(
  session: any
): Promise<{ DCOflag: boolean | null; MTQflag: boolean | null }> {
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN
      daynode.DCOrunningNow AS DCOflag,
      daynode.MTQrunningNow AS MTQflag
  `);

  if (result.records.length === 0) {
    logWarning("No active daynode found");
    return { DCOflag: null, MTQflag: null };
  }

  return {
    DCOflag: result.records[0].get("DCOflag"),
    MTQflag: result.records[0].get("MTQflag"),
  };
}

async function setMTQRunningFlag(
  session: any,
  value: boolean
): Promise<void> {
  const result = await session.run(
    `
    MATCH (daynode:Daynode {Active: true})
    SET daynode.MTQrunningNow = $value
    RETURN daynode
  `,
    { value }
  );

  if (result.records.length === 0) {
    logWarning("No active daynode found when setting MTQ running flag");
  }
}

async function processQueuedAccounts(
  ledgerSpaceSession: any,
  searchSpaceSession: any
): Promise<void> {
  const queuedAccounts = await getQueuedAccounts(ledgerSpaceSession);

  for (const account of queuedAccounts) {
    try {
      await createAccountInSearchSpace(searchSpaceSession, account);
      await markAccountAsProcessed(ledgerSpaceSession, account.accountID);
      logInfo(`Account created in searchSpace: ${account.accountName}`);
    } catch (error) {
      logError(`Error processing account ${account.accountName}`, error as Error);
    }
  }
}

async function getQueuedAccounts(session: any): Promise<Account[]> {
  const result = await session.run(`
    MATCH (newAccount:Account {queueStatus: "PENDING_ACCOUNT"})
    RETURN
      newAccount.accountID AS accountID,
      newAccount.accountName AS accountName
  `);
  return result.records.map((record: any) => ({
    accountID: record.get("accountID"),
    accountName: record.get("accountName"),
  }));
}

async function createAccountInSearchSpace(
  session: any,
  account: Account
): Promise<void> {
  const result = await session.run(
    `
    CREATE (newAccount:Account)
    SET newAccount = $account
    RETURN newAccount.accountID AS accountID
    `,
    { account }
  );

  if (result.records.length === 0) {
    throw new Error(
      `Failed to create account in searchSpace: ${account.accountName}`
    );
  }
}

async function markAccountAsProcessed(
  session: any,
  accountID: string
): Promise<void> {
  await session.run(
    `
    MATCH (processedAccount:Account {accountID: $accountID})
    SET processedAccount.queueStatus = "PROCESSED"
    `,
    { accountID }
  );
}

async function processQueuedCredexes(
  ledgerSpaceSession: any,
  searchSpaceSession: any
): Promise<void> {
  const queuedCredexes = await getQueuedCredexes(ledgerSpaceSession);
  const sortedQueuedCredexes = _.sortBy(queuedCredexes, "acceptedAt");

  for (const credex of sortedQueuedCredexes) {
    try {
      await LoopFinder(
        credex.issuerAccountID,
        credex.credexID,
        credex.amount,
        credex.denomination,
        credex.CXXmultiplier,
        credex.credexSecuredDenom,
        credex.dueDate,
        credex.acceptorAccountID
      );
    } catch (error) {
      logError(`Error processing credex ${credex.credexID}`, error as Error);
    }
  }
}

async function getQueuedCredexes(session: any): Promise<Credex[]> {
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

  return result.records.map((record: any) => ({
    acceptedAt: record.get("acceptedAt"),
    issuerAccountID: record.get("issuerAccountID"),
    acceptorAccountID: record.get("acceptorAccountID"),
    credexID: record.get("credexID"),
    amount: record.get("amount").toNumber(),
    denomination: record.get("denomination"),
    CXXmultiplier: record.get("CXXmultiplier").toNumber(),
    credexSecuredDenom:
      record.get("securerID") !== null
        ? record.get("denomination")
        : "floating",
    dueDate: record.get("dueDate"),
  }));
}
