import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { LoopFinder } from "./LoopFinder";
import _ from "lodash";
import logger from "../../utils/logger";

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
  logger.info("MinuteTransactionQueue started");
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  logger.debug("Checking if DCO or MTQ is in progress");

  try {
    const { DCOflag, MTQflag } = await checkDCOAndMTQStatus(ledgerSpaceSession);

    if (DCOflag === null || MTQflag === null) {
      logger.warn("No active daynode found. Skipping MTQ.");
      return false;
    }

    if (DCOflag || MTQflag) {
      if (DCOflag) logger.info("DCO in progress, holding MTQ");
      if (MTQflag) logger.info("MTQ already in progress, holding new MTQ");
      return false;
    }

    logger.info("Running MTQ");

    await setMTQRunningFlag(ledgerSpaceSession, true);

    const BAIL_TIME = 14 * 60 * 1000; // 14 minutes
    let bailTimerReached = false;
    const bailTimer = setTimeout(() => {
      logger.warn("Bail timer reached");
      bailTimerReached = true;
    }, BAIL_TIME);

    try {
      await processQueuedAccounts(ledgerSpaceSession, searchSpaceSession);
      await processQueuedCredexes(ledgerSpaceSession, searchSpaceSession);

      if (bailTimerReached) {
        logger.warn("MTQ processing completed after bail timer was reached");
      } else {
        logger.info("MTQ processing completed successfully");
      }
      return true;
    } catch (error) {
      logger.error("Error in MinuteTransactionQueue processing", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    } finally {
      clearTimeout(bailTimer);
      await setMTQRunningFlag(ledgerSpaceSession, false);
    }
  } catch (error) {
    logger.error("Unhandled error in MinuteTransactionQueue", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    await setMTQRunningFlag(ledgerSpaceSession, false);
    return false;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    logger.info("MinuteTransactionQueue finished");
  }
}

async function checkDCOAndMTQStatus(
  session: any
): Promise<{ DCOflag: boolean | null; MTQflag: boolean | null }> {
  logger.debug("Checking DCO and MTQ status");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    RETURN
      daynode.DCOrunningNow AS DCOflag,
      daynode.MTQrunningNow AS MTQflag
  `);

  if (result.records.length === 0) {
    logger.warn("No active daynode found");
    return { DCOflag: null, MTQflag: null };
  }

  const DCOflag = result.records[0].get("DCOflag");
  const MTQflag = result.records[0].get("MTQflag");
  logger.debug("DCO and MTQ status checked", { DCOflag, MTQflag });
  return { DCOflag, MTQflag };
}

async function setMTQRunningFlag(session: any, value: boolean): Promise<void> {
  logger.debug("Setting MTQ running flag", { value });
  const result = await session.run(
    `
    MATCH (daynode:Daynode {Active: true})
    SET daynode.MTQrunningNow = $value
    RETURN daynode
  `,
    { value }
  );

  if (result.records.length === 0) {
    logger.warn("No active daynode found when setting MTQ running flag");
  } else {
    logger.debug("MTQ running flag set successfully", { value });
  }
}

async function processQueuedAccounts(
  ledgerSpaceSession: any,
  searchSpaceSession: any
): Promise<void> {
  logger.info("Processing queued accounts");
  const queuedAccounts = await getQueuedAccounts(ledgerSpaceSession);
  logger.debug(`Found ${queuedAccounts.length} queued accounts`);

  for (const account of queuedAccounts) {
    try {
      await createAccountInSearchSpace(searchSpaceSession, account);
      await markAccountAsProcessed(ledgerSpaceSession, account.accountID);
      logger.info("Account created in searchSpace", {
        accountName: account.accountName,
        accountID: account.accountID,
      });
    } catch (error) {
      logger.error("Error processing account", {
        accountName: account.accountName,
        accountID: account.accountID,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
  logger.info("Finished processing queued accounts");
}

async function getQueuedAccounts(session: any): Promise<Account[]> {
  logger.debug("Getting queued accounts");
  const result = await session.run(`
    MATCH (newAccount:Account {queueStatus: "PENDING_ACCOUNT"})
    RETURN
      newAccount.accountID AS accountID,
      newAccount.accountName AS accountName
  `);
  const accounts = result.records.map((record: any) => ({
    accountID: record.get("accountID"),
    accountName: record.get("accountName"),
  }));
  logger.debug(`Retrieved ${accounts.length} queued accounts`);
  return accounts;
}

async function createAccountInSearchSpace(
  session: any,
  account: Account
): Promise<void> {
  logger.debug("Creating account in searchSpace", {
    accountName: account.accountName,
    accountID: account.accountID,
  });
  const result = await session.run(
    `
    CREATE (newAccount:Account)
    SET newAccount = $account
    RETURN newAccount.accountID AS accountID
    `,
    { account }
  );

  if (result.records.length === 0) {
    const error = new Error(
      `Failed to create account in searchSpace: ${account.accountName}`
    );
    logger.error("Account creation failed", {
      accountName: account.accountName,
      accountID: account.accountID,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
  logger.debug("Account created successfully in searchSpace", {
    accountName: account.accountName,
    accountID: account.accountID,
  });
}

async function markAccountAsProcessed(
  session: any,
  accountID: string
): Promise<void> {
  logger.debug("Marking account as processed", { accountID });
  await session.run(
    `
    MATCH (processedAccount:Account {accountID: $accountID})
    SET processedAccount.queueStatus = "PROCESSED"
    `,
    { accountID }
  );
  logger.debug("Account marked as processed", { accountID });
}

async function processQueuedCredexes(
  ledgerSpaceSession: any,
  searchSpaceSession: any
): Promise<void> {
  logger.info("Processing queued credexes");
  const queuedCredexes = await getQueuedCredexes(ledgerSpaceSession);
  const sortedQueuedCredexes = _.sortBy(queuedCredexes, "acceptedAt");
  logger.debug(`Found ${sortedQueuedCredexes.length} queued credexes`);

  for (const credex of sortedQueuedCredexes) {
    try {
      logger.debug("Processing credex", { credexID: credex.credexID });
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
      logger.debug("Credex processed successfully", {
        credexID: credex.credexID,
      });
    } catch (error) {
      logger.error("Error processing credex", {
        credexID: credex.credexID,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
  logger.info("Finished processing queued credexes");
}

async function getQueuedCredexes(session: any): Promise<Credex[]> {
  logger.debug("Getting queued credexes");
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

  const credexes = result.records.map((record: any) => ({
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
  logger.debug(`Retrieved ${credexes.length} queued credexes`);
  return credexes;
}
