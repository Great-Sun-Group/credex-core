/*
get full data for number of accounts requested, ordered by date created, paginated

required inputs:
    numRows (number accounts to return)
    startRow (for pagination)
        use 0 to start at first record (which will be Credex Foundation)
    if either of the above are strings that contain a number, number will be extracted and used
    if strings without number, no accounts will be returned

returns:
    full data for number of accounts requested

on error returns empty object
*/

import { ledgerSpaceDriver } from "../../Admin/config/neo4j";
import * as neo4j from "neo4j-driver";

export async function GetAccountsListService(
  numRows: number,
  startRow: number
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (account:Account)
            RETURN account
            ORDER BY account.createdAt ASC
            SKIP $startRow
            LIMIT $numRows
        `,
      {
        numRows: neo4j.int(numRows),
        startRow: neo4j.int(startRow),
      }
    );

    return result.records.map((record) => record.get("account").properties);
  } catch (error) {
    console.error("Error fetching accounts list:", error);
    return [];
  } finally {
    await ledgerSpaceSession.close();
  }
}
