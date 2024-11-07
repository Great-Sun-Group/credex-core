import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface AuthForTierSpendLimitResult {
  success: boolean;
  data?: {
    isAuthorized: boolean;
    availableAmount?: string;
    memberTier?: number;
  };
  message: string;
}

class MemberError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MemberError';
  }
}

/**
 * AuthForTierSpendLimitService
 * 
 * This service validates if a member's tier permits the requested spend amount.
 * Different tiers have different daily spend limits and secured/unsecured permissions.
 * 
 * @param issuerAccountID - ID of the account attempting to spend
 * @param amount - Amount of the transaction
 * @param denom - Denomination of the transaction
 * @param securedCredex - Whether this is a secured credex transaction
 * @param requestId - The ID of the HTTP request
 * @returns Object containing authorization result and available amount
 * @throws MemberError with specific error codes
 */
export async function AuthForTierSpendLimitService(
  issuerAccountID: string,
  amount: number,
  denom: string,
  securedCredex: boolean,
  requestId: string
): Promise<AuthForTierSpendLimitResult> {
  logger.debug("Entering AuthForTierSpendLimitService", {
    issuerAccountID,
    amount,
    denom,
    securedCredex,
    requestId
  });

  if (!issuerAccountID || amount === undefined || !denom) {
    throw new MemberError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing tier spend limit query", {
      issuerAccountID,
      amount,
      denom,
      requestId
    });

    const queryResult = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        // If memberTier = 1, and securedCredex = false return false immediately as "result"
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        WITH member, member.memberTier AS memberTier
        WHERE memberTier = 1 AND NOT $securedCredex
        RETURN
          {
            isAuthorized: false,
            message: "Unsecured credex not permitted on open tier"
          } AS result

        UNION

        // If memberTier > 2, return true immediately as "result"
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        WITH member, member.memberTier AS memberTier
        WHERE memberTier > 2
        RETURN
          {
            isAuthorized: true,
            message: "No daily limits on credex for paid tiers"
          } AS result

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
        { issuerAccountID, amount, denom, securedCredex }
      );
    });

    if (queryResult.records.length === 0) {
      throw new MemberError("Account not found", "NOT_FOUND");
    }

    const result = queryResult.records[0].get("result");

    // Handle direct tier-based results
    if (result.isAuthorized !== undefined) {
      logger.info("Tier-based authorization result", {
        issuerAccountID,
        isAuthorized: result.isAuthorized,
        message: result.message,
        requestId
      });

      return {
        success: true,
        data: {
          isAuthorized: result.isAuthorized
        },
        message: result.message
      };
    }

    // Calculate available amount for tier-limited members
    const memberTier = result.memberTier;
    const dayTotalUSD = result.dayTotalUSD || 0;
    const credexAmountUSD = result.credexAmountUSD;

    const tierLimits = {
      1: 10,  // Tier 1: $10 daily limit
      2: 100  // Tier 2: $100 daily limit
    };

    const amountAvailableUSD = tierLimits[memberTier as keyof typeof tierLimits] - dayTotalUSD;

    if (amountAvailableUSD >= credexAmountUSD) {
      logger.info("Authorization granted within tier limits", {
        issuerAccountID,
        memberTier,
        amountAvailableUSD,
        requestId
      });

      return {
        success: true,
        data: {
          isAuthorized: true,
          availableAmount: `${denomFormatter(amountAvailableUSD, "USD")} USD`,
          memberTier
        },
        message: "Authorization granted"
      };
    }

    logger.info("Authorization denied due to tier limit", {
      issuerAccountID,
      memberTier,
      amountAvailableUSD,
      requestId
    });

    return {
      success: true,
      data: {
        isAuthorized: false,
        availableAmount: `${denomFormatter(amountAvailableUSD, "USD")} USD`,
        memberTier
      },
      message: `You are only able to issue ${denomFormatter(amountAvailableUSD, "USD")} USD until tomorrow. Limits renew at midnight UTC.`
    };

  } catch (error) {
    if (error instanceof MemberError) {
      throw error;
    }

    logger.error("Unexpected error in AuthForTierSpendLimitService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      amount,
      denom,
      requestId
    });

    throw new MemberError(
      `Failed to check tier spend limit: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AuthForTierSpendLimitService", {
      issuerAccountID,
      requestId
    });
  }
}
