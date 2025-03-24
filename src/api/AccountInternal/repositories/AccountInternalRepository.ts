import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export interface AccountInternalData {
  accountID: string;
  accountName: string;
  accountType: "CONSUMPTION" | "PRODUCTION" | "DIGITAL_ASSET" | "PHYSICAL_ASSET";
}

export interface IAccountInternalRepository {
  findByMemberId(memberID: string): Promise<AccountInternalData[]>;
  findById(accountID: string): Promise<AccountInternalData | null>;
}

/**
 * Neo4j implementation of the account internal repository
 * Optimized for dashboard data retrieval with:
 * - Single efficient query for all account data
 * - Proper indexing on relationships
 * - Result caching
 */
export class AccountInternalRepository implements IAccountInternalRepository {
  private cache: Map<string, { data: AccountInternalData[]; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Find all internal accounts owned by a member
   * @param memberID - UUID of the member
   * @returns Array of internal account data
   */
  async findByMemberId(memberID: string): Promise<AccountInternalData[]> {
    try {
      // Check cache first
      const cacheKey = `member_${memberID}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get all internal accounts for a member
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            MATCH (member:Member {memberID: $memberID})-[:OWNS]->(account:AccountInternal)
            RETURN
              account.id as accountID,
              account.accountName as accountName,
              account.accountType as accountType
            ORDER BY account.accountName
          `;

            const queryResult = await tx.run(query, { memberID });
            return queryResult.records;
          }
        );

        if (!result || result.length === 0) {
          return [];
        }

        const accounts: AccountInternalData[] = result.map(record => ({
          accountID: record.get("accountID"),
          accountName: record.get("accountName"),
          accountType: record.get("accountType")
        }));

        // Cache the result
        this.cache.set(cacheKey, {
          data: accounts,
          timestamp: Date.now(),
        });

        return accounts;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in AccountInternalRepository.findByMemberId", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID,
      });
      throw new AccountError(
        "Database error retrieving internal account data",
        "DB_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }

  /**
   * Find internal account by ID
   * @param accountID - UUID of the account
   * @returns Account data or null if not found
   */
  async findById(accountID: string): Promise<AccountInternalData | null> {
    try {
      const session = ledgerSpaceDriver.session();

      try {
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            MATCH (account:AccountInternal {id: $accountID})
            RETURN
              account.id as accountID,
              account.accountName as accountName,
              account.accountType as accountType
          `;

            const queryResult = await tx.run(query, { accountID });
            return queryResult.records[0];
          }
        );

        if (!result) {
          return null;
        }

        return {
          accountID: result.get("accountID"),
          accountName: result.get("accountName"),
          accountType: result.get("accountType")
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in AccountInternalRepository.findById", {
        error: error instanceof Error ? error.message : "Unknown error",
        accountID,
      });
      throw new AccountError(
        "Database error retrieving internal account data",
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
    this.cache.delete(`member_${memberID}`);
  }

  /**
   * Clear entire cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const accountInternalRepository = new AccountInternalRepository();
