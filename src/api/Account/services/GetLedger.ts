import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

export async function GetLedgerService(
  accountID: string,
  numRows: number = 10,
  startRow: number = 0
) {
  logDebug(`Entering GetLedgerService`, { accountID, numRows, startRow });

  numRows = Math.round(Number(numRows));
  startRow = Math.round(Number(startRow));

  if (Number.isNaN(numRows) || Number.isNaN(startRow)) {
    logWarning(`Invalid numRows or startRow`, { accountID, numRows, startRow });
    return "numRows and startRows must be numbers";
  }

  try {
    logDebug(`Attempting to fetch ledger data from database`, { accountID, numRows, startRow });
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
            (account:Account{accountID:$accountID})-[transactionType:OWES|CLEARED]-(credex:Credex)-[:OWES|CLEARED]-(counterparty:Account)
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
        numRows: neo4j.int(numRows),
        startRow: neo4j.int(startRow),
      }
    );

    await ledgerSpaceSession.close();

    if (!result.records[0].get("credexID")) {
      logInfo(`No credexes found for account`, { accountID });
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

    logInfo(`Successfully fetched ledger data`, { accountID, credexCount: credexes.length });
    logDebug(`Exiting GetLedgerService`, { accountID });
    return credexes;
  } catch (error) {
    logError(`Error in GetLedgerService:`, error as Error, { accountID, numRows, startRow });
    throw error;
  }
}
