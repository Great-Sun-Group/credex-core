/*
Returns balance information for a account

required input: accountID,

on success returns formatted strings:
{
    //secured balances held in all currencies are returned here
    //if none, empty securedNetBalancesByDenom array returned
    "securedNetBalancesByDenom": [
        "3,450.57 USD",
        "14.00 ZIG"
    ],
    //unsecured balances in any denom are converted to the account's defaultDenom at current rates
    //if no balance, string returned with 0 and denom, eg "0.00 USD"
    "unsecuredBalancesinDefaultDenom": {
        "totalPayables": "200.00 USD",
        "totalReceivables": "20.00 USD",
        "netPayRec": "-180.00 USD"
    },
    //secured and unsecured balances netted in account's defaultDenom
    //if no balance, string returned with 0 and denom, eg "0.00 USD"
    "netCredexAssetsInDefaultDenom": "3,271.61 USD"
}

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";

export async function GetBalancesService(accountID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const getSecuredBalancesQuery = await ledgerSpaceSession.run(
      `
        MATCH (account:Account{accountID:$accountID})
        
        OPTIONAL MATCH (account)-[:OWES|OFFERED]-(securedCredex:Credex)<-[:SECURES]-()
        WITH DISTINCT securedCredex.Denomination AS denom, account

        OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex{Denomination:denom})<-[:SECURES]-()
        WITH sum(inSecuredCredex.OutstandingAmount) as sumSecuredIn, denom, account
        
        OPTIONAL MATCH (account)-[:OWES]->(outSecuredCredex:Credex{Denomination:denom})<-[:SECURES]-()
        WITH sum(outSecuredCredex.OutstandingAmount) as sumSecuredOut, denom, sumSecuredIn

        MATCH (daynode:DayNode{Active:true})

        RETURN denom, (sumSecuredIn - sumSecuredOut) / daynode[denom] AS netSecured
      `,
      { accountID }
    );

    var securedNetBalancesByDenom: string[] = [];
    if (getSecuredBalancesQuery.records[0].get("denom")) {
      securedNetBalancesByDenom = getSecuredBalancesQuery.records.map(
        (record) => {
          const [currency, amount] = record["_fields"];
          const formattedAmount =
            typeof amount === "number" && !isNaN(amount)
              ? denomFormatter(amount, currency)
              : "0";
          return `${formattedAmount} ${currency}`;
        }
      );
    }

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
        MATCH (daynode:DayNode{Active:true})
        RETURN
          defaultDenom,
          receivablesTotalCXX / daynode[defaultDenom] AS receivablesTotalInDefaultDenom,
          payablesTotalCXX / daynode[defaultDenom] AS payablesTotalInDefaultDenom,
          unsecuredNetCXX / daynode[defaultDenom] AS unsecuredNetInDefaultDenom,
          netCredexAssetsCXX / daynode[defaultDenom] AS netCredexAssetsInDefaultDenom
      `,
        { accountID }
      );

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

    return {
      securedNetBalancesByDenom,
      unsecuredBalancesInDefaultDenom,
      netCredexAssetsInDefaultDenom: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("netCredexAssetsInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };
  } catch (error) {
    console.error("Error fetching balances:", error);
    throw new Error("Failed to fetch balances. Please try again later.");
  } finally {
    await ledgerSpaceSession.close();
  }
}
