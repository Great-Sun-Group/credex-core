import { ledgerSpaceDriver } from "../../config/neo4j";
import { logInfo, logError } from "../utils/logger";

async function checkAccountBalance(accountHandle: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
      MATCH (account:Account {accountHandle: $accountHandle})
      OPTIONAL MATCH (account)-[rel]-(credex:Credex)
      RETURN account.accountID as accountID, 
             account.accountHandle as accountHandle,
             collect({
               credexID: credex.credexID,
               initialAmount: credex.InitialAmount,
               outstandingAmount: credex.OutstandingAmount,
               secured: credex.securedCredex,
               status: credex.queueStatus,
               createdAt: credex.createdAt,
               relationType: type(rel)
             }) as credexes
      `,
      { accountHandle }
    );

    if (result.records.length === 0) {
      logError(`No account found with handle: ${accountHandle}`, new Error(`Account not found`), { accountHandle });
      return;
    }

    const record = result.records[0];
    const accountID = record.get('accountID');
    const credexes = record.get('credexes');

    logInfo('Account Details', {
      accountID,
      accountHandle,
      credexes: credexes
    });

    // Additional query to check all Credexes related to this account
    const allCredexes = await ledgerSpaceSession.run(
      `
      MATCH (credex:Credex)
      WHERE credex.issuerAccountID = $accountID OR credex.receiverAccountID = $accountID
      RETURN credex
      `,
      { accountID }
    );

    logInfo('All related Credexes', {
      count: allCredexes.records.length,
      credexes: allCredexes.records.map(record => record.get('credex').properties)
    });

    // Detailed Credex Query
    const detailedCredexQuery = await ledgerSpaceSession.run(
      `
      MATCH (account:Account {accountHandle: $accountHandle})
      MATCH (credex:Credex)
      WHERE credex.issuerAccountID = account.accountID OR credex.receiverAccountID = account.accountID
      RETURN 
        credex.credexID as credexID,
        credex.InitialAmount as initialAmount,
        credex.OutstandingAmount as outstandingAmount,
        credex.securedCredex as secured,
        credex.queueStatus as status,
        credex.createdAt as createdAt,
        credex.issuerAccountID as issuerAccountID,
        credex.receiverAccountID as receiverAccountID,
        [(account)-[rel]-(credex) | type(rel)] as relationTypes
      `,
      { accountHandle }
    );

    logInfo('Detailed Credex Information', {
      credexes: detailedCredexQuery.records.map(record => record.toObject())
    });

  } catch (error) {
    logError("Error checking account balance", error as Error, { accountHandle });
  } finally {
    await ledgerSpaceSession.close();
  }
}

// Use the account handle from your previous script
checkAccountBalance("23729624032");
