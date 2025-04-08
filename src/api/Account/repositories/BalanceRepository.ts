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
  private static instance: BalanceRepository;
  private cache: Map<string, { data: BalanceData; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): BalanceRepository {
    if (!BalanceRepository.instance) {
      BalanceRepository.instance = new BalanceRepository();
    }
    return BalanceRepository.instance;
  }

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
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            // Match the account and get its default denomination
            MATCH (account:Account {accountID: $accountID})
            
            // Get active daynode for rate conversions
            MATCH (daynode:Daynode {Active: true})
            
            // First collect all active denominations from secured credexes
            WITH account, daynode

            // Get denominations from incoming OWES
            OPTIONAL MATCH (account)<-[:OWES]-(inCredex:Credex)<-[:SECURES]-()
            WHERE NOT (inCredex)-[:CLEARED]->()
            WITH account, daynode, collect(DISTINCT inCredex.Denomination) AS inDenoms

            // Get denominations from outgoing OWES and OFFERS
            OPTIONAL MATCH (account)-[r:OWES|OFFERS]->(outCredex:Credex)<-[:SECURES]-()
            WHERE NOT (outCredex)-[:CLEARED]->() AND type(r) IN ['OWES', 'OFFERS']
            WITH account, daynode, inDenoms, collect(DISTINCT outCredex.Denomination) AS outDenoms

            // Combine denominations
            WITH account, daynode, inDenoms + outDenoms AS allDenoms

            // Unwind and make unique list of denominations
            UNWIND allDenoms AS denom
            WITH DISTINCT denom, account, daynode
            WHERE denom IS NOT NULL

            // Calculate secured balances
            // Incoming - only count OWES (certain)
            OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
            WHERE NOT (inSecuredCredex)-[:CLEARED]->()
            WITH denom, account, daynode,
                reduce(s = 0, n IN collect(DISTINCT inSecuredCredex) | s + n.OutstandingAmount) AS sumSecuredIn

            // Outgoing OWES - use OutstandingAmount
            OPTIONAL MATCH (account)-[:OWES]->(outSecuredOwesCredex:Credex {Denomination: denom})<-[:SECURES]-()
            WHERE NOT (outSecuredOwesCredex)-[:CLEARED]->()
            WITH denom, account, daynode, sumSecuredIn,
                reduce(s = 0, n IN collect(DISTINCT outSecuredOwesCredex) | s + n.OutstandingAmount) AS sumSecuredOwesOut

            // Outgoing OFFERS - use InitialAmount
            OPTIONAL MATCH (account)-[:OFFERS]->(outSecuredOffersCredex:Credex {Denomination: denom})<-[:SECURES]-()
            WHERE NOT (outSecuredOffersCredex)-[:CLEARED]->()
            WITH denom, account, daynode, sumSecuredIn, sumSecuredOwesOut,
                reduce(s = 0, n IN collect(DISTINCT outSecuredOffersCredex) | s + n.InitialAmount) AS sumSecuredOffersOut

            // Calculate total outgoing (OWES + OFFERS)
            WITH denom, account, daynode, sumSecuredIn,
                sumSecuredOwesOut + sumSecuredOffersOut AS sumSecuredOut

            // Calculate net secured balance for each denomination
            WITH denom, account, daynode,
                (sumSecuredIn - sumSecuredOut) / daynode[toString(denom)] AS netSecured
            
            // Get unsecured balances
            WITH collect({denom: denom, amount: netSecured}) AS securedBalances,
                account, daynode
            
            // Get unsecured incoming OWES
            OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexUnsecured:Credex)
            WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
            WITH account, daynode, securedBalances,
                collect(DISTINCT owesInCredexUnsecured) AS unsecuredCredexesIn
            
            // Get unsecured outgoing OWES
            OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexUnsecured:Credex)
            WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
            WITH account, daynode, securedBalances, unsecuredCredexesIn,
                collect(DISTINCT owesOutCredexUnsecured) AS unsecuredCredexesOwesOut
            
            // Get unsecured outgoing OFFERS
            OPTIONAL MATCH (account)-[:OFFERS]->(offersOutCredexUnsecured:Credex)
            WHERE NOT (offersOutCredexUnsecured)<-[:SECURES]-()
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOwesOut,
                collect(DISTINCT offersOutCredexUnsecured) AS unsecuredCredexesOffersOut
            
            // Calculate total assets including both OWES and OFFERS
            // Incoming OWES
            OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexAll:Credex)
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOwesOut, unsecuredCredexesOffersOut,
                collect(DISTINCT owesInCredexAll) AS owesInCredexesAll
            
            // Outgoing OWES
            OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexAll:Credex)
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOwesOut, unsecuredCredexesOffersOut,
                owesInCredexesAll, collect(DISTINCT owesOutCredexAll) AS owesOutCredexesAll
            
            // Outgoing OFFERS
            OPTIONAL MATCH (account)-[:OFFERS]->(offersOutCredexAll:Credex)
            WITH account, daynode, securedBalances, unsecuredCredexesIn, unsecuredCredexesOwesOut, unsecuredCredexesOffersOut,
                owesInCredexesAll, owesOutCredexesAll,
                collect(DISTINCT offersOutCredexAll) AS offersOutCredexesAll
            
            WITH account, daynode, securedBalances,
                // Receivables (incoming OWES)
                REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount) AS receivablesTotalCXX,
                // Payables (outgoing OWES + OFFERS)
                REDUCE(total = 0, credex IN unsecuredCredexesOwesOut | total + credex.OutstandingAmount) +
                REDUCE(total = 0, credex IN unsecuredCredexesOffersOut | total + credex.InitialAmount) AS payablesTotalCXX,
                // Calculate net assets including OWES and OFFERS
                REDUCE(total = 0, credex IN owesInCredexesAll | total + credex.OutstandingAmount) -
                REDUCE(total = 0, credex IN owesOutCredexesAll | total + credex.OutstandingAmount) -
                REDUCE(total = 0, credex IN offersOutCredexesAll | total + credex.InitialAmount) AS netCredexAssetsCXX
            
            RETURN
                account.defaultDenom AS defaultDenom,
                securedBalances,
                receivablesTotalCXX / daynode[toString(account.defaultDenom)] AS receivablesTotalInDefaultDenom,
                payablesTotalCXX / daynode[toString(account.defaultDenom)] AS payablesTotalInDefaultDenom,
                netCredexAssetsCXX / daynode[toString(account.defaultDenom)] AS netCredexAssetsInDefaultDenom
          `;

            const queryResult = await tx.run(query, { accountID });
            return queryResult.records[0];
          }
        );

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
              result.get("receivablesTotalInDefaultDenom") -
                result.get("payablesTotalInDefaultDenom"),
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
