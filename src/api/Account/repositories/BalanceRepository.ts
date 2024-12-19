import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

export interface BalanceData {
  securedNetBalancesByDenom: string[];
  unsecuredBalancesInDefaultDenom: {
    totalPayables: string;
    totalReceivables: string;
    netPayRec: string;
  };
  netCredexAssetsInDefaultDenom: string;
}

export interface IBalanceRepository {
  getBalances(accountID: string): Promise<BalanceData>;
}

/**
 * Neo4j implementation of the balance repository
 * Optimized for dashboard data retrieval with:
 * - Efficient balance calculation queries
 * - Proper indexing on relationships and properties
 * - Result caching
 */
export class BalanceRepository implements IBalanceRepository {
  private cache: Map<string, { data: BalanceData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Get all balance data for an account
   * @param accountID - UUID of the account
   * @returns Formatted balance data
   */
  async getBalances(accountID: string): Promise<BalanceData> {
    try {
      // Check cache first
      const cached = this.cache.get(accountID);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get all balance data
        const result = await session.executeRead(async (tx: ManagedTransaction) => {
          const query = `
            // Match the account and get its default denomination
            MATCH (account:Account {accountID: $accountID})
            
            // Get active daynode for rate conversions
            MATCH (daynode:Daynode {Active: true})
            
            // Get all unique denominations from Credex nodes
            OPTIONAL MATCH (account)-[:OWES|OFFERED]-(securedCredex:Credex)<-[:SECURES]-()
            WITH DISTINCT securedCredex.Denomination AS denom, account, daynode
            WHERE denom IS NOT NULL
            
            // Calculate secured balances by denomination
            OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
            WITH denom, account, daynode,
                collect(DISTINCT inSecuredCredex) AS inSecuredCredexes
            
            OPTIONAL MATCH (account)-[:OWES|OFFERED]->(outSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
            WITH denom, account, daynode,
                reduce(s = 0, n IN inSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredIn,
                collect(DISTINCT outSecuredCredex) AS outSecuredCredexes
            
            WITH denom, account, daynode,
                sumSecuredIn,
                reduce(s = 0, n IN outSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredOut
            
            // Calculate net secured balance for each denomination
            WITH denom, account, daynode,
                (sumSecuredIn - sumSecuredOut) / daynode[denom] AS netSecured
            WHERE netSecured <> 0
            
            // Get unsecured balances
            WITH collect({denom: denom, amount: netSecured}) AS securedBalances,
                account, daynode
            
            OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexUnsecured:Credex)
            WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
            WITH account, daynode, securedBalances,
                collect(DISTINCT owesInCredexUnsecured) AS unsecuredCredexesIn
            
            OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexUnsecured:Credex)
            WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
            WITH account, daynode, securedBalances, unsecuredCredexesIn,
                collect(DISTINCT owesOutCredexUnsecured) AS unsecuredCredexesOut
            
            // Calculate total assets
            OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexAll:Credex)
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOut,
                collect(DISTINCT owesInCredexAll) AS owesInCredexesAll
            
            OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexAll:Credex)
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOut,
                owesInCredexesAll, collect(DISTINCT owesOutCredexAll) AS owesOutCredexesAll
            
            WITH account, daynode, securedBalances,
                REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount) AS receivablesTotalCXX,
                REDUCE(total = 0, credex IN unsecuredCredexesOut | total + credex.OutstandingAmount) AS payablesTotalCXX,
                REDUCE(total = 0, credex IN owesInCredexesAll | total + credex.OutstandingAmount) -
                REDUCE(total = 0, credex IN owesOutCredexesAll | total + credex.OutstandingAmount) AS netCredexAssetsCXX
            
            RETURN
                account.defaultDenom AS defaultDenom,
                securedBalances,
                receivablesTotalCXX / daynode[account.defaultDenom] AS receivablesTotalInDefaultDenom,
                payablesTotalCXX / daynode[account.defaultDenom] AS payablesTotalInDefaultDenom,
                netCredexAssetsCXX / daynode[account.defaultDenom] AS netCredexAssetsInDefaultDenom
          `;

          const queryResult = await tx.run(query, { accountID });
          return queryResult.records[0];
        });

        if (!result) {
          throw new AccountError(
            "Account not found",
            "NOT_FOUND",
            ErrorCodes.Account.NOT_FOUND
          );
        }

        const defaultDenom = result.get("defaultDenom");
        const securedBalances = result.get("securedBalances") || [];

        // Format balance data
        const balanceData: BalanceData = {
          securedNetBalancesByDenom: securedBalances.map(
            (b: any) => `${denomFormatter(b.amount, b.denom)} ${b.denom}`
          ),
          unsecuredBalancesInDefaultDenom: {
            totalPayables: `${denomFormatter(
              result.get("payablesTotalInDefaultDenom"),
              defaultDenom
            )} ${defaultDenom}`,
            totalReceivables: `${denomFormatter(
              result.get("receivablesTotalInDefaultDenom"),
              defaultDenom
            )} ${defaultDenom}`,
            netPayRec: `${denomFormatter(
              result.get("receivablesTotalInDefaultDenom") - result.get("payablesTotalInDefaultDenom"),
              defaultDenom
            )} ${defaultDenom}`,
          },
          netCredexAssetsInDefaultDenom: `${denomFormatter(
            result.get("netCredexAssetsInDefaultDenom"),
            defaultDenom
          )} ${defaultDenom}`,
        };

        // Cache the result
        this.cache.set(accountID, {
          data: balanceData,
          timestamp: Date.now(),
        });

        return balanceData;

      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in BalanceRepository.getBalances", {
        error: error instanceof Error ? error.message : "Unknown error",
        accountID,
      });

      if (error instanceof AccountError) {
        throw error;
      }

      throw new AccountError(
        "Database error retrieving balance data",
        "DB_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }

  /**
   * Clear cache for a specific account
   * @param accountID - UUID of the account
   */
  clearCache(accountID: string): void {
    this.cache.delete(accountID);
  }

  /**
   * Clear entire balance cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}
