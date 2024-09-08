import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";

export async function AuthForTierSpendLimitService(
  issuerAccountID: string,
  amount: number,
  denom: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const queryResult = await ledgerSpaceSession.run(
      `
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        WITH member, member.memberTier AS memberTier

        // If memberTier > 2, return true immediately as "result"
        WHERE memberTier > 2
        RETURN true AS result

        UNION

        // If memberTier <= 2, proceed with the larger search query and return calculated values in an object as "result"
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        WITH member, member.memberTier AS memberTier, account
        WHERE memberTier <= 2
        MATCH (daynode:Daynode { Active: true })
        OPTIONAL MATCH (member)-[:OWNS]->(allAccounts:Account)
        OPTIONAL MATCH
          (allAccounts)-[:OWES|OFFERS]->(credex:Credex),
          (credex)-[:CREATED_ON]->(daynode)
        WITH
          daynode.USD AS daynodeUSD,
          SUM(credex.InitialAmount) AS dayTotalCXX,
          $amount * daynode[$denom] AS credexAmountCXX,
          memberTier
        RETURN
          {
            dayTotalUSD: dayTotalCXX / daynodeUSD,
            credexAmountUSD: credexAmountCXX / daynodeUSD,
            memberTier: memberTier
          } AS result
    `,
      { issuerAccountID, amount, denom }
    );

    if (queryResult.records.length === 0) {
      return "query error";
    }
    if (queryResult.records[0].get("result") == true) {
      return true;
    }

    const memberTier = queryResult.records[0].get("result").memberTier;
    const dayTotalUSD = queryResult.records[0].get("result").dayTotalUSD;
    const credexAmountUSD =
      queryResult.records[0].get("result").credexAmountUSD;

    var amountAvailableUSD = 0;
    if (memberTier == 1) {
      amountAvailableUSD = 10 - dayTotalUSD;
    }
    if (memberTier == 2) {
      amountAvailableUSD = 100 - dayTotalUSD;
    }
    if (amountAvailableUSD >= credexAmountUSD) {
      return true;
    } else {
      return (
        "You are only able to issue " +
        denomFormatter(amountAvailableUSD, "USD") +
        " USD until tomorrow. Limits renew at midnight UTC."
      );
    }
  } finally {
    await ledgerSpaceSession.close();
  }
}
