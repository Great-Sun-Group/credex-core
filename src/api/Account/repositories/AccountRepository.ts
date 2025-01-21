import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export interface AccountData {
  accountID: string;
  accountName: string;
  accountHandle: string;
  accountType:
    | "PERSONAL"
    | "BUSINESS"
    | "CREDEX_FOUNDATION"
    | "TRUST"
    | "OPERATIONS";
  defaultDenom: "CXX" | "CAD" | "USD" | "XAU" | "ZWG";
  isOwnedAccount: boolean;
  sendOffersTo?: {
    memberID: string;
    firstname: string;
    lastname: string;
  };
  authorizedMembers: {
    memberID: string;
    firstname: string;
    lastname: string;
  }[];
}

export interface IAccountRepository {
  findByIdWithAccess(
    accountID: string,
    memberID: string
  ): Promise<AccountData | null>;
  findAccessibleAccountIds(memberID: string): Promise<string[]>;
  findById(accountID: string): Promise<AccountData | null>;
}

/**
 * Neo4j implementation of the account repository
 * Optimized for dashboard data retrieval with:
 * - Single efficient query for all account data
 * - Proper indexing on accountID and relationships
 * - Result caching
 */
export class AccountRepository implements IAccountRepository {
  private cache: Map<string, { data: AccountData; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Find account by ID with access check and member data
   * @param accountID - UUID of the account
   * @param memberID - UUID of the requesting member
   * @returns Account data or null if not found/no access
   */
  async findByIdWithAccess(
    accountID: string,
    memberID: string
  ): Promise<AccountData | null> {
    try {
      // Check cache first
      const cacheKey = `${accountID}_${memberID}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get all required account data
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            // First find the account and log its existence
            const accountQuery = await tx.run(
              `
              MATCH (account:Account { accountID: $accountID })
              RETURN account IS NOT NULL as accountExists
            `,
              { accountID }
            );

            const accountExists = accountQuery.records[0]?.get("accountExists");
            logger.debug("Account check", { accountID, exists: accountExists });

            // Then check authorization paths and log results
            const authQuery = await tx.run(
              `
              MATCH (account:Account { accountID: $accountID })
              OPTIONAL MATCH (signer:Member|Recurring)
              WHERE (signer:Member AND signer.memberID = $memberID)
                 OR (signer:Recurring AND signer.recurringID = $memberID)
              
              // Check authorization paths
              WITH account, signer
              OPTIONAL MATCH path1 = (signer)-[:AUTHORIZED_FOR]->(account)
              OPTIONAL MATCH (signer)-[:ACTIVE]-(account)<-[:AUTHORIZED_FOR]-(:Member)-[:SIGNED]->(sig:Signature)-[:SIGNED]->(signer)
              
              RETURN
                account.accountID as accountID,
                signer:Member as memberExists,
                signer:Recurring as recurringExists,
                path1 IS NOT NULL as hasDirectAuth,
                EXISTS((signer)-[:ACTIVE]->(account)) as hasActiveRelation,
                sig IS NOT NULL as hasOwnerSigned
            `,
              { accountID, memberID }
            );

            const auth = authQuery.records[0];
            if (auth) {
              logger.debug("Authorization check", {
                memberExists: auth.get("memberExists"),
                recurringExists: auth.get("recurringExists"),
                hasDirectAuth: auth.get("hasDirectAuth"),
                hasActiveRelation: auth.get("hasActiveRelation"),
                hasOwnerSigned: auth.get("hasOwnerSigned"),
              });
            }

            // Now execute the actual query
            const query = `
            // Match signer (Member or Recurring)
            MATCH (signer:Member|Recurring)
            WHERE (signer:Member AND signer.memberID = $memberID)
               OR (signer:Recurring AND signer.recurringID = $memberID)
            
            MATCH (account:Account {accountID: $accountID})
            
            // Check authorization paths
            OPTIONAL MATCH path1 = (signer)-[:AUTHORIZED_FOR]->(account)
            OPTIONAL MATCH path2 = (signer)-[:ACTIVE]-(account)<-[:AUTHORIZED_FOR]-(:Member)-[:SIGNED]->(:Signature)-[:SIGNED]->(signer)
            
            WITH account, signer, 
                 CASE WHEN path1 IS NOT NULL THEN true  // Direct authorization
                      WHEN path2 IS NOT NULL THEN true  // Recurring template with member authorization
                      ELSE false
                 END as hasAccess
            WHERE hasAccess = true
            
            // Get all authorized members
            WITH account, signer
            MATCH (account)<-[:AUTHORIZED_FOR]-(allAuthMembers:Member)
            
            // Check ownership
            OPTIONAL MATCH (account)<-[owns:AUTHORIZED_FOR]-(m:Member { memberID: $memberID })
            
            // Get send offers to member if exists
            OPTIONAL MATCH (account)-[:SEND_OFFERS_TO]->(sendOffersTo:Member)
            
            RETURN
              account.accountID AS accountID,
              account.accountType AS accountType,
              account.accountName AS accountName,
              account.accountHandle AS accountHandle,
              account.defaultDenom AS defaultDenom,
              owns IS NOT NULL AS isOwnedAccount,
              // Collect authorized members
              collect({
                memberID: allAuthMembers.memberID,
                firstname: allAuthMembers.firstname,
                lastname: allAuthMembers.lastname
              }) AS authorizedMembers,
              // Send offers to data
              sendOffersTo.memberID AS sendOffersToMemberID,
              sendOffersTo.firstname AS sendOffersToFirstname,
              sendOffersTo.lastname AS sendOffersToLastname
          `;

            const queryResult = await tx.run(query, { accountID, memberID });
            return queryResult.records[0];
          }
        );

        if (!result) {
          return null;
        }

        const accountData: AccountData = {
          accountID: result.get("accountID"),
          accountName: result.get("accountName"),
          accountHandle: result.get("accountHandle"),
          accountType: result.get("accountType"),
          defaultDenom: result.get("defaultDenom"),
          isOwnedAccount: result.get("isOwnedAccount"),
          authorizedMembers: result.get("authorizedMembers"),
        };

        // Add send offers to information if available
        if (result.get("sendOffersToMemberID")) {
          accountData.sendOffersTo = {
            memberID: result.get("sendOffersToMemberID"),
            firstname: result.get("sendOffersToFirstname"),
            lastname: result.get("sendOffersToLastname"),
          };
        }

        // Cache the result
        this.cache.set(cacheKey, {
          data: accountData,
          timestamp: Date.now(),
        });

        return accountData;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in AccountRepository.findByIdWithAccess", {
        error: error instanceof Error ? error.message : "Unknown error",
        accountID,
        memberID,
      });
      throw new AccountError(
        "Database error retrieving account data",
        "DB_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }

  /**
   * Find all account IDs accessible to a member
   * @param memberID - UUID of the member
   * @returns Array of accessible account IDs
   */
  async findAccessibleAccountIds(memberID: string): Promise<string[]> {
    try {
      const session = ledgerSpaceDriver.session();

      try {
        // Efficient query to get just account IDs
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            MATCH (member:Member { memberID: $memberID })
            MATCH (member)-[:AUTHORIZED_FOR]->(account:Account)
            // Using index on :Member(memberID)
            RETURN collect(account.accountID) as accountIDs
          `;

            const queryResult = await tx.run(query, { memberID });
            return queryResult.records[0].get("accountIDs");
          }
        );

        return result || [];
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in AccountRepository.findAccessibleAccountIds", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID,
      });
      throw new AccountError(
        "Database error retrieving accessible accounts",
        "DB_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }

  /**
   * Clear cache for a specific account/member combination
   * @param accountID - UUID of the account
   * @param memberID - UUID of the member
   */
  clearCache(accountID: string, memberID: string): void {
    this.cache.delete(`${accountID}_${memberID}`);
  }

  /**
   * Clear entire account cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Find account by ID without access check
   * @param accountID - UUID of the account
   * @returns Account data or null if not found
   */
  async findById(accountID: string): Promise<AccountData | null> {
    try {
      // Check cache first - use accountID only as key
      const cacheKey = accountID;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const session = ledgerSpaceDriver.session();

      try {
        // Single optimized query to get account data
        const result = await session.executeRead(
          async (tx: ManagedTransaction) => {
            const query = `
            MATCH (account:Account { accountID: $accountID })
            
            // Get all authorized members in one go
            MATCH (account)<-[:AUTHORIZED_FOR]-(allAuthMembers:Member)
            
            // Get send offers to member if exists
            OPTIONAL MATCH (account)-[:SEND_OFFERS_TO]->(sendOffersTo:Member)
            
            RETURN
              account.accountID AS accountID,
              account.accountType AS accountType,
              account.accountName AS accountName,
              account.accountHandle AS accountHandle,
              account.defaultDenom AS defaultDenom,
              false AS isOwnedAccount,
              // Collect authorized members
              collect({
                memberID: allAuthMembers.memberID,
                firstname: allAuthMembers.firstname,
                lastname: allAuthMembers.lastname
              }) AS authorizedMembers,
              // Send offers to data
              sendOffersTo.memberID AS sendOffersToMemberID,
              sendOffersTo.firstname AS sendOffersToFirstname,
              sendOffersTo.lastname AS sendOffersToLastname
          `;

            const queryResult = await tx.run(query, { accountID });
            return queryResult.records[0];
          }
        );

        if (!result) {
          return null;
        }

        const accountData: AccountData = {
          accountID: result.get("accountID"),
          accountName: result.get("accountName"),
          accountHandle: result.get("accountHandle"),
          accountType: result.get("accountType"),
          defaultDenom: result.get("defaultDenom"),
          isOwnedAccount: false,
          authorizedMembers: result.get("authorizedMembers"),
        };

        // Add send offers to information if available
        if (result.get("sendOffersToMemberID")) {
          accountData.sendOffersTo = {
            memberID: result.get("sendOffersToMemberID"),
            firstname: result.get("sendOffersToFirstname"),
            lastname: result.get("sendOffersToLastname"),
          };
        }

        // Cache the result
        this.cache.set(cacheKey, {
          data: accountData,
          timestamp: Date.now(),
        });

        return accountData;
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error("Error in AccountRepository.findById", {
        error: error instanceof Error ? error.message : "Unknown error",
        accountID,
      });
      throw new AccountError(
        "Database error retrieving account data",
        "DB_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }
}
