import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

export async function GetLedgerService(
  accountID: string,
  memberID: string,
  numRows: number = 10,
  startRow: number = 0
) {
  logDebug(`Entering GetLedgerService`, { accountID, memberID, numRows, startRow });

  numRows = Math.round(Number(numRows));
  startRow = Math.round(Number(startRow));

  if (Number.isNaN(numRows) || Number.isNaN(startRow)) {
    logWarning(`Invalid numRows or startRow`, { accountID, numRows, startRow });
    return "numRows and startRows must be numbers";
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    logDebug(`Attempting to fetch ledger data from database`, { accountID, memberID, numRows, startRow });
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
            (member:Member {memberID: $memberID})-[:AUTHORIZED_FOR]->(account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED]-(credex:Credex)-[:OWES|CLEARED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        RETURN
            credex.credexID AS credexID,
            credex.InitialAmount/credex.CXXmultiplier AS InitialAmount,
            credex.Denomination AS Denomination,
            (startNode(transactionType) = account) as debit,
            counterparty.accountName AS counterpartyAccountName
            ORDER BY credex.acceptedAt
            SKIP $startRow
            LIMIT $numRows
    `,
      {
        accountID: accountID,
        memberID: memberID,
        numRows: neo4j.int(numRows),
        startRow: neo4j.int(startRow),
      }
    );

    // If no records or first record has no credexID, check if it's due to unauthorized access
    if (result.records.length === 0 || !result.records[0].get("credexID")) {
      // Run a separate query to check if the account exists and user is authorized
      const authCheck = await ledgerSpaceSession.run(
        `
        MATCH (member:Member {memberID: $memberID})-[:AUTHORIZED_FOR]->(account:Account {accountID: $accountID})
        RETURN account
        `,
        { memberID, accountID }
      );

      if (authCheck.records.length === 0) {
        logWarning(`Unauthorized access attempt`, { memberID, accountID });
        throw new Error("Unauthorized access to account");
      }

      // If authorized but no credexes, return empty result
      logInfo(`No credexes found for account`, { accountID, memberID });
      return {};
    }

    const credexes = result.records.map((record) => {
      const credexID = record.get("credexID");
      const InitialAmount = record.get("debit")
        ? -parseFloat(record.get("InitialAmount"))
        : record.get("InitialAmount");
      const Denomination = record.get("Denomination");
      const counterpartyAccountName = record.get("counterpartyAccountName");

      const formattedInitialAmount =
        denomFormatter(InitialAmount, Denomination) + " " + Denomination;

      return {
        credexID,
        formattedInitialAmount,
        counterpartyAccountName,
      };
    });

    logInfo(`Successfully fetched ledger data`, { accountID, memberID, credexCount: credexes.length });
    logDebug(`Exiting GetLedgerService`, { accountID, memberID });
    return credexes;
  } catch (error) {
    logError(`Error in GetLedgerService:`, error as Error, { accountID, memberID, numRows, startRow });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
