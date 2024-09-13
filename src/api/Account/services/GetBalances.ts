import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

export async function GetBalancesService(accountID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  logger.debug("GetBalancesService entered", { accountID });

  try {
    logger.debug("Fetching secured balances");
    const getSecuredBalancesQuery = await ledgerSpaceSession.run(
      `
      MATCH (account:Account {accountID: $accountID})

      // Get all unique denominations from Credex nodes related to the account
      OPTIONAL MATCH (account)-[:OWES|OFFERED]-(securedCredex:Credex)<-[:SECURES]-()
      WITH DISTINCT securedCredex.Denomination AS denom, account

      // Aggregate incoming secured amounts for each denomination ensuring uniqueness
      OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
      WITH denom, account, 
          collect(DISTINCT inSecuredCredex) AS inSecuredCredexes

      // Aggregate outgoing secured amounts for each denomination ensuring uniqueness
      OPTIONAL MATCH (account)-[:OWES|OFFERED]->(outSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
      WITH denom, 
          reduce(s = 0, n IN inSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredIn, 
          collect(DISTINCT outSecuredCredex) AS outSecuredCredexes

      // Calculate the total outgoing amount
      WITH denom, sumSecuredIn, 
          reduce(s = 0, n IN outSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredOut

      // Get the current day node which should have active status
      MATCH (daynode:Daynode {Active: true})

      // Calculate the net secured balance for each denomination and return the result
      RETURN denom, (sumSecuredIn - sumSecuredOut) / daynode[denom] AS netSecured
      `,
      { accountID }
    );

    logger.debug("Processing secured balances");
    const securedNetBalancesByDenom: string[] = getSecuredBalancesQuery.records
      .filter((record) => {
        const amount = record.get("netSecured");
        return typeof amount === "number" && isFinite(amount) && amount !== 0;
      })
      .map((record) => {
        const denom = record.get("denom");
        const amount = record.get("netSecured");
        return `${denomFormatter(amount, denom)} ${denom}`;
      });

    logger.debug("Fetching unsecured balances and total assets");
    const getUnsecuredBalancesAndTotalAssetsQuery =
      await ledgerSpaceSession.run(
        `
        MATCH (account:Account{accountID:$accountID})

        OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexUnsecured:Credex)
        WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
        WITH account, COLLECT(DISTINCT owesInCredexUnsecured) AS unsecuredCredexesIn

        OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexUnsecured:Credex)
        WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
        WITH account, unsecuredCredexesIn, COLLECT(DISTINCT owesOutCredexUnsecured) AS unsecuredCredexesOut

        OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexAll:Credex)
        WITH account, unsecuredCredexesIn, unsecuredCredexesOut, COLLECT(DISTINCT owesInCredexAll) AS owesInCredexesAll

        OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexAll:Credex)
        WITH account, unsecuredCredexesIn, unsecuredCredexesOut, owesInCredexesAll, COLLECT(DISTINCT owesOutCredexAll) AS owesOutCredexesAll

        WITH
          account.defaultDenom AS defaultDenom,
          REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount) AS receivablesTotalCXX,
          REDUCE(total = 0, credex IN unsecuredCredexesOut | total + credex.OutstandingAmount) AS payablesTotalCXX,
          REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount)
            - REDUCE(total = 0, credex IN unsecuredCredexesOut | total + credex.OutstandingAmount) AS unsecuredNetCXX,
          REDUCE(total = 0, credex IN owesInCredexesAll | total + credex.OutstandingAmount)
            - REDUCE(total = 0, credex IN owesOutCredexesAll | total + credex.OutstandingAmount) AS netCredexAssetsCXX
        MATCH (daynode:Daynode{Active:true})
        RETURN
          defaultDenom,
          receivablesTotalCXX / daynode[defaultDenom] AS receivablesTotalInDefaultDenom,
          payablesTotalCXX / daynode[defaultDenom] AS payablesTotalInDefaultDenom,
          unsecuredNetCXX / daynode[defaultDenom] AS unsecuredNetInDefaultDenom,
          netCredexAssetsCXX / daynode[defaultDenom] AS netCredexAssetsInDefaultDenom
      `,
        { accountID }
      );

    logger.debug("Processing unsecured balances and total assets");
    const unsecuredBalancesAndTotalAssets =
      getUnsecuredBalancesAndTotalAssetsQuery.records[0];
    const defaultDenom = unsecuredBalancesAndTotalAssets.get("defaultDenom");
    const unsecuredBalancesInDefaultDenom = {
      totalPayables: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("payablesTotalInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
      totalReceivables: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("receivablesTotalInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
      netPayRec: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("unsecuredNetInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };

    const result = {
      securedNetBalancesByDenom,
      unsecuredBalancesInDefaultDenom,
      netCredexAssetsInDefaultDenom: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("netCredexAssetsInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };

    logger.info("Balances fetched successfully", { accountID });
    logger.debug("GetBalancesService exiting", { accountID });
    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error fetching balances:", {
        accountID,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error("Unknown error fetching balances:", {
        accountID,
        error: String(error),
      });
    }
    logger.debug("GetBalancesService exiting with error", { accountID });
    throw new Error("Failed to fetch balances. Please try again later.");
  } finally {
    await ledgerSpaceSession.close();
  }
}
