/*

returns details to display a ledger list of transactions

requires:
  accountID

requires (with defaults if not included)
  numRows (number of transactions to return, default is 10)
  startRow (number of row to start at, for pagination, default is first row)

returns for each credex:
  credexID
  formattedInitialAmount (string eg 8,546.32 USD)
  counterpartyDisplayname

returns empty array if no credexes

returns error message if numRows or startRows can't be coerced into numbers
returns empty array if accountID not valid

*/

import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../Core/constants/denominations";

export async function GetLedgerService(
  accountID: string,
  numRows: number = 10,
  startRow: number = 0
) {
  numRows = Math.round(Number(numRows));
  startRow = Math.round(Number(startRow));

  if (Number.isNaN(numRows) || Number.isNaN(startRow)) {
    return "numRows and startRows must be numbers";
  }

  try {
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

    return credexes;
  } catch (error) {
    console.error("Error in GetLedgerService:", error);
    throw error;
  }
}
