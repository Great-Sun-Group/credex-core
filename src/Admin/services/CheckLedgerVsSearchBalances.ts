import { ledgerSpaceDriver, searchSpaceDriver } from "../config/neo4j";

export async function CheckLedgerVsSearchBalances() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    // Query ledgerSpace for credex data
    const ledgerSpaceCredexesQuery = await ledgerSpaceSession.run(`
      MATCH (credex:Credex)
      RETURN
        credex.credexID AS credexIDledger,
        credex.OutstandingAmount AS OutstandingAmountLedger
    `);

    // Query searchSpace for credex data
    const searchSpaceCredexesQuery = await searchSpaceSession.run(`
      MATCH (credex:Credex)
      RETURN
        credex.credexID AS credexIDsearch,
        credex.outstandingAmount AS OutstandingAmountSearch
    `);

    // Process ledgerSpace results
    const ledgerSpaceCredexes = ledgerSpaceCredexesQuery.records.map(
      (record) => ({
        credexID: record.get("credexIDledger"),
        OutstandingAmount: record.get("OutstandingAmountLedger"),
      })
    );

    // Process searchSpace results
    const searchSpaceCredexes = searchSpaceCredexesQuery.records.map(
      (record) => ({
        credexID: record.get("credexIDsearch"),
        OutstandingAmount: record.get("OutstandingAmountSearch"),
      })
    );

    // Create a map for quick lookup from searchSpace
    const searchSpaceCredexMap = new Map(
      searchSpaceCredexes.map((credex) => [
        credex.credexID,
        credex.OutstandingAmount,
      ])
    );

    // Compare and analyze the data
    let matchingCount = 0;
    const mismatchedCredexes = [];

    for (const ledgerCredex of ledgerSpaceCredexes) {
      const searchOutstandingAmount = searchSpaceCredexMap.get(
        ledgerCredex.credexID
      );

      // If the credex does not exist in searchSpace and the amount in ledgerSpace is 0, count as a match
      if (
        searchOutstandingAmount === undefined &&
        ledgerCredex.OutstandingAmount === 0
      ) {
        matchingCount++;
      } else if (ledgerCredex.OutstandingAmount === searchOutstandingAmount) {
        matchingCount++;
      } else {
        mismatchedCredexes.push({
          credexID: ledgerCredex.credexID,
          OutstandingAmountLedger: ledgerCredex.OutstandingAmount,
          OutstandingAmountSearch: searchOutstandingAmount || 0,
        });
      }
    }

    // Return the results
    return {
      matchingCount,
      mismatchedCredexes,
    };
  } catch (error) {
    console.error("An error occurred during the execution:", error);
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}
