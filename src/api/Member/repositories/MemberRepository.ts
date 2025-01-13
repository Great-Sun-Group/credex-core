import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { MemberError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export interface MemberData {
  id: string;
  tier: number;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
}

export interface IMemberRepository {
  findById(memberID: string): Promise<MemberData | null>;
}

/**
 * Neo4j implementation of the member repository
 * Optimized for dashboard data retrieval with:
 * - Single query for all member data
 * - Proper indexing on memberID
 * - Result caching
 */
export class MemberRepository implements IMemberRepository {
  private cache: Map<string, { data: MemberData; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Find member by ID with optimized query and caching
   * @param memberID - UUID of the member
   * @returns Member data or null if not found
   */
  async findById(memberID: string): Promise<MemberData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(memberID);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get all required member data
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            MATCH (member:Member {memberID: $memberID})
            // Using index on :Member(memberID)
            RETURN
              member.memberID as id,
              member.memberTier as tier,
              member.firstname as firstname,
              member.lastname as lastname,
              member.memberHandle as memberHandle,
              member.defaultDenom as defaultDenom
          `;

            const queryResult = await tx.run(query, { memberID });
            return queryResult.records[0];
          }
        );

        if (!result) {
          return null;
        }

        // Get all required fields
        const id = result.get("id");
        const tier = result.get("tier");
        const firstname = result.get("firstname");
        const lastname = result.get("lastname");
        const memberHandle = result.get("memberHandle");
        const defaultDenom = result.get("defaultDenom");

        // Validate required fields
        if (!memberHandle) {
          logger.error("Member found with null memberHandle", { memberID });
          throw new MemberError(
            "Invalid member data: handle is required",
            "INVALID_MEMBER_DATA",
            ErrorCodes.Member.INVALID_DATA
          );
        }

        const memberData: MemberData = {
          id,
          tier: tier ? tier.toNumber() : 0,
          firstname,
          lastname,
          memberHandle,
          defaultDenom,
        };

        // Cache the result
        this.cache.set(memberID, {
          data: memberData,
          timestamp: Date.now(),
        });

        return memberData;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in MemberRepository.findById", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID,
      });
      throw new MemberError(
        "Database error retrieving member data",
        "DB_ERROR",
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
   * Clear entire member cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}
