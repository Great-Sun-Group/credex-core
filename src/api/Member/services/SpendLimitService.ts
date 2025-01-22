import { ManagedTransaction, int } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { MemberError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export interface ISpendLimitService {
  getRemainingLimit(memberID: string): Promise<number>;
}

/**
 * Service for handling tier-specific spend limit calculations
 * Optimized with:
 * - Efficient queries using proper indexes
 * - Result caching
 * - Tier-specific logic
 */
export class SpendLimitService implements ISpendLimitService {
  private cache: Map<string, { limit: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  // Tier-specific daily limits in USD
  private readonly TIER_LIMITS = {
    1: 10, // Tier 1: $10 daily limit
    2: 100, // Tier 2: $100 daily limit
    // Tier 3+: No limit
  };

  /**
   * Calculate remaining available USD for a member based on their tier
   * @param memberID - UUID of the member
   * @returns Remaining available USD or undefined if no limit applies
   */
  async getRemainingLimit(memberID: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.cache.get(memberID);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.limit;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get member tier and current day's usage
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            // Get member and their tier first
            MATCH (member:Member {memberID: $memberID})
            WITH member, coalesce(member.memberTier, 0) AS memberTier
            
            // For tier 3+, return tier with 0 usage
            OPTIONAL MATCH (daynode:Daynode { Active: true })
            WITH member, memberTier, daynode
            WHERE memberTier > 2
            RETURN
              memberTier as tier,
              0 as dailyUsageUSD
            
            UNION
            
            // Calculate usage for tiers 1 and 2
            MATCH (member:Member {memberID: $memberID})
            WITH member, coalesce(member.memberTier, 0) AS memberTier
            WHERE memberTier <= 2
            OPTIONAL MATCH (daynode:Daynode { Active: true })
            OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
            OPTIONAL MATCH
              (account)-[r:OFFERS|OWES]->
              (credex:Credex)-[:CREATED_ON]->(daynode)
            WITH 
              memberTier,
              daynode.USD as daynodeUSD,
              collect(credex) as credexes
            
            // Return tier and calculated usage with more precise math
            RETURN
              memberTier as tier,
              CASE 
                WHEN size(credexes) > 0 
                THEN reduce(total = 0.0, c IN credexes |
                  total + (c.InitialAmount * daynodeUSD) / c.CXXmultiplier
                )
                ELSE 0 
              END as dailyUsageUSD
          `;

            return await tx.run(query, { memberID });
          }
        );

        if (!result || result.records.length === 0) {
          logger.warn("No records found for member", { memberID });
          return 0;
        }

        const record = result.records[0];
        const tierValue = record.get("tier");
        const tier = tierValue ? tierValue.toNumber() : 0;

        if (!tier) {
          logger.warn("Member tier not found or is 0", { memberID });
          return 0;
        }

        // Return Infinity for tier 3+
        if (tier > 2) {
          return Infinity;
        }

        // Get tier limit
        const tierLimit =
          this.TIER_LIMITS[tier as keyof typeof this.TIER_LIMITS];
        if (!tierLimit) {
          return Infinity;
        }

        const dailyUsageUSD = record.get("dailyUsageUSD");
        // Neo4j returns this as a float already since we used 0.0 in the query
        const dailyUsageNumber = dailyUsageUSD || 0;

        // Calculate remaining limit
        const remainingLimit = Math.max(0, tierLimit - dailyUsageNumber);

        // Cache the result
        this.cache.set(memberID, {
          limit: remainingLimit,
          timestamp: Date.now(),
        });

        return remainingLimit;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in SpendLimitService.getRemainingLimit", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID,
      });

      // Log full error details
      if (error instanceof Error) {
        logger.error("Full error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
          memberID,
        });

        // Check if it's a Neo4j error (has code property)
        const neo4jError = error as { code?: string };
        if (neo4jError.code) {
          logger.error("Neo4j error:", {
            code: neo4jError.code,
            message: error.message,
          });
        }
      } else {
        logger.error("Unknown error type:", { error });
      }

      if (error instanceof MemberError) {
        throw error;
      }

      throw new MemberError(
        "Error calculating spend limit",
        "CALCULATION_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }

  /**
   * Clear cache for a specific member
   * @param memberID - UUID of the member
   */
  clearCache(memberID: string): void {
    this.cache.delete(memberID);
  }

  /**
   * Clear entire spend limit cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}
