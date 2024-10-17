import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

export async function AuthForTierSpendLimitService(
  issuerAccountID: string,
  amount: number,
  denom: string
) {
  logger.debug("AuthForTierSpendLimitService called", {
    issuerAccountID,
    amount,
    denom,
  });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query for tier spend limit authorization");
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
      logger.warn("Query returned no results", {
        issuerAccountID,
        amount,
        denom,
      });
      return {
        isAuthorized: false,
        message: "No results found for the given account",
      };
    }
    if (queryResult.records[0].get("result") == true) {
      logger.info("Authorization granted for high tier member", {
        issuerAccountID,
        amount,
        denom,
      });
      return {
        isAuthorized: true,
        message: "Authorization granted for high tier member",
      };
    }

    const memberTier = queryResult.records[0].get("result").memberTier;
    const dayTotalUSD = queryResult.records[0].get("result").dayTotalUSD;
    const credexAmountUSD =
      queryResult.records[0].get("result").credexAmountUSD;

    logger.debug("Authorization calculation", {
      memberTier,
      dayTotalUSD,
      credexAmountUSD,
    });

    var amountAvailableUSD = 0;
    if (memberTier == 1) {
      amountAvailableUSD = 10 - dayTotalUSD;
    }
    if (memberTier == 2) {
      amountAvailableUSD = 100 - dayTotalUSD;
    }
    if (amountAvailableUSD >= credexAmountUSD) {
      logger.info("Authorization granted", {
        issuerAccountID,
        amount,
        denom,
        amountAvailableUSD,
      });
      return { isAuthorized: true, message: "Authorization granted" };
    } else {
      const message = `You are only able to issue ${denomFormatter(amountAvailableUSD, "USD")} USD until tomorrow. Limits renew at midnight UTC.`;
      logger.warn("Authorization denied due to limit", {
        issuerAccountID,
        amount,
        denom,
        amountAvailableUSD,
        message,
      });
      return { isAuthorized: false, message };
    }
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      amount,
      denom,
    });
    return {
      isAuthorized: false,
      message: `Query error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    logger.debug("Closing database session", { issuerAccountID });
    await ledgerSpaceSession.close();
  }
}
