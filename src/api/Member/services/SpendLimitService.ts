import { ManagedTransaction } from "neo4j-driver";
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

  // Tier-specific monthly limits in USD
  private readonly TIER_LIMITS = {
    1: 1000,  // Tier 1: $1,000 monthly limit
    2: 5000,  // Tier 2: $5,000 monthly limit
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
        // Single optimized query to get member tier and current month's usage
        const result = await session.executeRead(async (tx: ManagedTransaction) => {
          const query = `
            MATCH (member:Member {memberID: $memberID})
            // Using index on :Member(memberID)
            
            // Get current month's transactions
            OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
            OPTIONAL MATCH (account)-[:OWES]->(credex:Credex)
            WHERE 
              date(credex.createdAt) >= date.truncate('month', date()) AND
              credex.status = 'ACTIVE'
            
            // Calculate total USD value using daynode rates
            WITH member, credex
            MATCH (daynode:Daynode {Active: true})
            
            RETURN
              member.tier as tier,
              sum(
                CASE 
                  WHEN credex IS NOT NULL 
                  THEN credex.OutstandingAmount / daynode['USD'] 
                  ELSE 0 
                END
              ) as monthlyUsageUSD
          `;

          const queryResult = await tx.run(query, { memberID });
          return queryResult.records[0];
        });

        if (!result) {
          throw new MemberError(
            "Member not found",
            "NOT_FOUND",
            ErrorCodes.Member.NOT_FOUND
          );
        }

        const tier = result.get("tier");
        const monthlyUsageUSD = result.get("monthlyUsageUSD") || 0;

        // Get tier limit
        const tierLimit = this.TIER_LIMITS[tier as keyof typeof this.TIER_LIMITS];
        if (!tierLimit) {
          return Infinity; // No limit for higher tiers
        }

        // Calculate remaining limit
        const remainingLimit = Math.max(0, tierLimit - monthlyUsageUSD);

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
