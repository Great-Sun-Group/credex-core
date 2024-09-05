import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { Session } from "neo4j-driver";
import { LoopFinder } from "./LoopFinder";
import _ from "lodash";
import logger from "../../../config/logger";

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

  logger.info("MTQ start: checking if DCO or MTQ is in progress");

  try {
    const { DCOflag, MTQflag } = await checkDCOAndMTQStatus(ledgerSpaceSession);

    if (DCOflag || MTQflag) {
      if (DCOflag) logger.info("DCO in progress, holding MTQ");
      if (MTQflag) logger.info("MTQ already in progress, holding new MTQ");
      return false;
    }

    logger.info("Running MTQ");

    await setMTQRunningFlag(ledgerSpaceSession, true);

    const BAIL_TIME = 14 * 60 * 1000; // 14 minutes
    const bailTimer = setTimeout(() => {
      logger.warn("Bail timer reached");
      return true;
    }, BAIL_TIME);

    try {
      await processQueuedAccounts(ledgerSpaceSession, searchSpaceSession);
      await processQueuedCredexes(ledgerSpaceSession, searchSpaceSession);
    } finally {
      clearTimeout(bailTimer);
      await setMTQRunningFlag(ledgerSpaceSession, false);
    }

    logger.info("MTQ processing completed");
    return true;
  } catch (error) {
    logger.error("Error in MinuteTransactionQueue:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

async function checkDCOAndMTQStatus(session: Session): Promise<{ DCOflag: boolean; MTQflag: boolean }> {
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN
      daynode.DCOrunningNow AS DCOflag,
      daynode.MTQrunningNow AS MTQflag
  `);
  return {
    DCOflag: result.records[0].get("DCOflag"),
    MTQflag: result.records[0].get("MTQflag")
  };
}

async function setMTQRunningFlag(session: Session, value: boolean): Promise<void> {
  await session.run(`
    MATCH (daynode:Daynode {Active: true})
    SET daynode.MTQrunningNow = $value
  `, { value });
}

async function processQueuedAccounts(ledgerSpaceSession: Session, searchSpaceSession: Session): Promise<void> {
  const queuedAccounts = await getQueuedAccounts(ledgerSpaceSession);

  for (const account of queuedAccounts) {
    try {
      await createAccountInSearchSpace(searchSpaceSession, account);
      await markAccountAsProcessed(ledgerSpaceSession, account.accountID);
      logger.info(`Account created in searchSpace: ${account.accountName}`);
    } catch (error) {
      logger.error(`Error processing account ${account.accountName}:`, error);
    }
  }
}

async function getQueuedAccounts(session: Session): Promise<Account[]> {
  const result = await session.run(`
    MATCH (newAccount:Account {queueStatus: "PENDING_ACCOUNT"})
    RETURN
      newAccount.accountID AS accountID,
      newAccount.accountName AS accountName
  `);
  return result.records.map((record: any) => ({
    accountID: record.get("accountID"),
    accountName: record.get("accountName")
  }));
}

async function createAccountInSearchSpace(session: Session, account: Account): Promise<void> {
  const result = await session.run(
    `
    CREATE (newAccount:Account)
    SET newAccount = $account
    RETURN newAccount.accountID AS accountID
    `,
    { account }
  );

  if (result.records.length === 0) {
    throw new Error(`Failed to create account in searchSpace: ${account.accountName}`);
  }
}

async function markAccountAsProcessed(session: Session, accountID: string): Promise<void> {
  await session.run(
    `
    MATCH (processedAccount:Account {accountID: $accountID})
    SET processedAccount.queueStatus = "PROCESSED"
    `,
    { accountID }
  );
}

async function processQueuedCredexes(ledgerSpaceSession: Session, searchSpaceSession: Session): Promise<void> {
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
      logger.error(`Error processing credex ${credex.credexID}:`, error);
    }
  }
}

async function getQueuedCredexes(session: Session): Promise<Credex[]> {
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
    credexSecuredDenom: record.get("securerID") !== null ? record.get("denomination") : "floating",
    dueDate: record.get("dueDate")
  }));
}
