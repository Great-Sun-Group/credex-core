import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface TierSpendLimitData {
  isAuthorized?: boolean;
  availableAmount?: string;
  memberTier?: number;
  currentSpendUSD?: number;
  tierLimitUSD?: number;
}

interface TierSpendLimitResult {
  success: boolean;
  data?: TierSpendLimitData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseTierResult {
  success: boolean;
  data?: {
    isAuthorized: boolean;
    message?: string;
    dayTotalUSD?: number;
    credexAmountUSD?: number;
    memberTier?: number;
  };
  error?: string;
}

/**
 * AuthForTierSpendLimitService
 *
 * Validates if a member's tier permits the requested spend amount.
 * Different tiers have different daily spend limits:
 * - Tier 1: $10 daily limit
 * - Tier 2: $100 daily limit
 * - Tier 3+: No limits
 *
 * @param issuerAccountID - ID of the account attempting to spend
 * @param amount - Amount of the transaction
 * @param denom - Denomination of the transaction
 * @param securedCredex - Whether this is a secured credex transaction
 * @param requestId - The ID of the HTTP request
 * @returns TierSpendLimitResult containing authorization status and available amount
 */
export async function AuthForTierSpendLimitService(
  issuerAccountID: string,
  amount: number,
  denom: string,
  securedCredex: boolean,
  requestId: string
): Promise<TierSpendLimitResult> {
  logger.debug("Entering AuthForTierSpendLimitService", {
    issuerAccountID,
    amount,
    denom,
    securedCredex,
    requestId,
  });

  if (!issuerAccountID || amount === undefined || !denom) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "issuerAccountID, amount, and denom are required",
      },
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing tier spend limit query", {
      issuerAccountID,
      amount,
      denom,
      requestId,
    });

    const result: DatabaseTierResult = await ledgerSpaceSession.executeRead(
      async (tx) => {
        const queryResult = await tx.run(
          `
        // If memberTier > 2, return true immediately as "result"
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        WITH member, member.memberTier AS memberTier
        WHERE memberTier > 2
        RETURN
          {
            isAuthorized: true,
            message: "No daily limits on credex for paid tiers",
            memberTier: memberTier
          } AS result

        UNION

        // If memberTier <= 2, proceed with the larger search query
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

        if (queryResult.records.length === 0) {
          return {
            success: false,
            error: "NOT_FOUND",
          };
        }

        const result = queryResult.records[0].get("result");
        return {
          success: true,
          data: {
            isAuthorized:
              result.isAuthorized !== undefined ? result.isAuthorized : false,
            message: result.message,
            dayTotalUSD: result.dayTotalUSD,
            credexAmountUSD: result.credexAmountUSD,
            memberTier: result.memberTier,
          },
        };
      }
    );

    if (!result.success) {
      return {
        success: false,
        message: "Account not found",
        error: {
          code: "NOT_FOUND",
          details: "The specified account does not exist",
        },
      };
    }

    const data = result.data;
    if (!data) {
      return {
        success: false,
        message: "Failed to retrieve tier data",
        error: {
          code: "DATA_ERROR",
          details: "Failed to retrieve tier and spend data",
        },
      };
    }

    // Handle direct tier-based results
    if (data.isAuthorized !== undefined && data.message) {
      logger.info("Tier-based authorization result", {
        issuerAccountID,
        isAuthorized: data.isAuthorized,
        message: data.message,
        requestId,
      });

      if (!data.isAuthorized) {
        return {
          success: false,
          message: data.message,
          error: {
            code: "TIER_LIMIT_EXCEEDED",
            details: data.message,
          },
        };
      }

      return {
        success: true,
        data: {
          isAuthorized: true, // Added this
          memberTier: data.memberTier,
        },
        message: data.message,
      };
    }

    // Calculate available amount for tier-limited members
    const memberTier = data.memberTier;
    const dayTotalUSD = data.dayTotalUSD || 0;
    const credexAmountUSD = data.credexAmountUSD || 0;

    const tierLimits = {
      1: 10, // Tier 1: $10 daily limit
      2: 100, // Tier 2: $100 daily limit
    };

    const tierLimit = tierLimits[memberTier as keyof typeof tierLimits];
    const amountAvailableUSD = tierLimit - dayTotalUSD;

    if (amountAvailableUSD >= credexAmountUSD) {
      logger.info("Authorization granted within tier limits", {
        issuerAccountID,
        memberTier,
        amountAvailableUSD,
        requestId,
      });

      return {
        success: true,
        data: {
          isAuthorized: true, // Added this
          availableAmount: `${denomFormatter(amountAvailableUSD, "USD")} USD`,
          memberTier,
          currentSpendUSD: dayTotalUSD,
          tierLimitUSD: tierLimit,
        },
        message: "Authorization granted",
      };
    }

    logger.info("Authorization denied due to tier limit", {
      issuerAccountID,
      memberTier,
      amountAvailableUSD,
      requestId,
    });

    return {
      success: false,
      data: {
        isAuthorized: false, // Added this
        availableAmount: `${denomFormatter(amountAvailableUSD, "USD")} USD`,
        memberTier,
        currentSpendUSD: dayTotalUSD,
        tierLimitUSD: tierLimit,
      },
      message: `You are only able to issue ${denomFormatter(amountAvailableUSD, "USD")} USD until tomorrow. Limits renew at midnight UTC.`,
      error: {
        code: "TIER_LIMIT_EXCEEDED",
        details: `Daily limit of ${denomFormatter(tierLimit, "USD")} USD exceeded`,
      },
    };
  } catch (error) {
    logger.error("Unexpected error in AuthForTierSpendLimitService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      amount,
      denom,
      requestId,
    });

    return {
      success: false,
      message: "Failed to check tier spend limit",
      error: {
        code: "INTERNAL_ERROR",
        details:
          error instanceof Error
            ? error.message
            : "An unknown error occurred while checking spend limit",
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AuthForTierSpendLimitService", {
      issuerAccountID,
      requestId,
    });
  }
}
