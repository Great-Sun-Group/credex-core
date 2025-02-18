import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j";
import logger from "../../src/utils/logger";

/**
 * Utility class for cleaning up test data
 */
export class TestCleanup {
  private static createdMemberIDs: string[] = [];
  private static createdPhones: string[] = [];
  private static createdAccountIDs: string[] = [];

  /**
   * Track a member for cleanup
   */
  static trackMember(memberID: string, phone: string) {
    this.createdMemberIDs.push(memberID);
    this.createdPhones.push(phone);
  }

  /**
   * Track an account for cleanup
   */
  static trackAccount(accountID: string) {
    this.createdAccountIDs.push(accountID);
  }

  /**
   * Clean up test data in ledger space
   */
  private static async cleanupLedgerSpace() {
    const session = ledgerSpaceDriver.session();
    try {
      // Safety check - don't proceed if no test data is tracked
      if (this.createdMemberIDs.length === 0 && 
          this.createdPhones.length === 0 && 
          this.createdAccountIDs.length === 0) {
        logger.info("No test data tracked for cleanup");
        return;
      }

      // Protected entities that should never be deleted
      const PROTECTED_PHONE = "263778177125"; // GREATSUN_TRUST
      const PROTECTED_ACCOUNTS = ["GREATSUN_TRUST_CAD", "GREATSUN_TRUST_USD"];

      // First clean up all relationships and dependent nodes connected to test members
      if (this.createdMemberIDs.length > 0) {
        logger.info(`Cleaning up ${this.createdMemberIDs.length} tracked test members by ID`);
        
        // Log counts before cleanup
        const beforeCounts = await session.run(`
          MATCH (m:Member) WHERE m.memberID IN $memberIDs
          AND NOT m.phone = $protectedPhone
          OPTIONAL MATCH (m)-[r]->(n)
          RETURN 
            count(DISTINCT m) as memberCount,
            count(DISTINCT r) as relationshipCount,
            count(DISTINCT n) as connectedNodeCount
        `, { 
          memberIDs: this.createdMemberIDs,
          protectedPhone: PROTECTED_PHONE
        });
        
        const counts = beforeCounts.records[0].toObject();
        logger.info("Ledger space counts before cleanup:", counts);

        if (counts.memberCount === 0) {
          logger.info("No matching test members found for cleanup");
        } else {
          // Clean up all connected data except protected entities
          await session.run(`
            MATCH (m:Member) WHERE m.memberID IN $memberIDs
            AND NOT m.phone = $protectedPhone
            OPTIONAL MATCH (m)-[r1]-(n)
            WHERE NOT n:Daynode AND NOT (n:Member AND n.phone = $protectedPhone)
            OPTIONAL MATCH (n)-[r2]-(x)
            WHERE NOT x:Daynode AND NOT (x:Member AND x.phone = $protectedPhone)
            WITH m, r1, n, r2, x
            DETACH DELETE x, n, m
          `, { 
            memberIDs: this.createdMemberIDs,
            protectedPhone: PROTECTED_PHONE
          });
          logger.info(`Cleaned up members and connected nodes`);
        }
      }

      // Clean up by phone numbers as backup
      if (this.createdPhones.length > 0) {
        logger.info(`Cleaning up ${this.createdPhones.length} tracked test members by phone`);
        await session.run(`
          MATCH (m:Member) WHERE m.phone IN $phones
          AND NOT m.phone = $protectedPhone
          OPTIONAL MATCH (m)-[r1]-(n)
          WHERE NOT n:Daynode AND NOT (n:Member AND n.phone = $protectedPhone)
          OPTIONAL MATCH (n)-[r2]-(x)
          WHERE NOT x:Daynode AND NOT (x:Member AND x.phone = $protectedPhone)
          WITH m, r1, n, r2, x
          DETACH DELETE x, n, m
        `, { 
          phones: this.createdPhones,
          protectedPhone: PROTECTED_PHONE
        });
      }

      // Clean up any orphaned accounts except protected accounts
      if (this.createdAccountIDs.length > 0) {
        logger.info(`Cleaning up ${this.createdAccountIDs.length} tracked test accounts`);
        await session.run(`
          MATCH (a:Account) WHERE a.accountID IN $accountIDs
          AND NOT a.accountHandle IN $protectedAccounts
          OPTIONAL MATCH (a)-[r]-(n)
          WHERE NOT n:Daynode AND NOT (n:Member AND n.phone = $protectedPhone)
          DETACH DELETE a, n
        `, { 
          accountIDs: this.createdAccountIDs,
          protectedAccounts: PROTECTED_ACCOUNTS,
          protectedPhone: PROTECTED_PHONE
        });
      }

      // Verify cleanup
      const afterCounts = await session.run(`
        MATCH (m:Member) 
        WHERE (m.memberID IN $memberIDs OR m.phone IN $phones)
        AND NOT m.phone = $protectedPhone
        RETURN count(m) as remainingMembers
      `, { 
        memberIDs: this.createdMemberIDs,
        phones: this.createdPhones,
        protectedPhone: PROTECTED_PHONE
      });

      const remaining = afterCounts.records[0].get('remainingMembers').toNumber();
      if (remaining > 0) {
        logger.warn(`Found ${remaining} remaining test members after cleanup`);
      } else {
        logger.info("Ledger space cleanup successful - all test data removed");
      }

    } catch (error) {
      logger.error("Error cleaning up ledger space:", error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Clean up test data in search space
   */
  private static async cleanupSearchSpace() {
    const session = searchSpaceDriver.session();
    try {
      // Safety check - don't proceed if no test data is tracked
      if (this.createdMemberIDs.length === 0 && 
          this.createdPhones.length === 0 && 
          this.createdAccountIDs.length === 0) {
        logger.info("No test data tracked for search space cleanup");
        return;
      }

      // Protected entities that should never be deleted
      const PROTECTED_PHONE = "263778177125"; // GREATSUN_TRUST
      const PROTECTED_ACCOUNTS = ["GREATSUN_TRUST_CAD", "GREATSUN_TRUST_USD"];

      // Clean up members and accounts in search space
      if (this.createdMemberIDs.length > 0) {
        logger.info(`Cleaning up ${this.createdMemberIDs.length} tracked test members by ID in search space`);
        await session.run(`
          MATCH (m:Member) WHERE m.memberID IN $memberIDs
          AND NOT m.phone = $protectedPhone
          OPTIONAL MATCH (m)-[r]-(n)
          WHERE NOT (n:Member AND n.phone = $protectedPhone)
          DETACH DELETE m, n
        `, { 
          memberIDs: this.createdMemberIDs,
          protectedPhone: PROTECTED_PHONE
        });
      }

      if (this.createdPhones.length > 0) {
        logger.info(`Cleaning up ${this.createdPhones.length} tracked test members by phone in search space`);
        await session.run(`
          MATCH (m:Member) WHERE m.phone IN $phones
          AND NOT m.phone = $protectedPhone
          OPTIONAL MATCH (m)-[r]-(n)
          WHERE NOT (n:Member AND n.phone = $protectedPhone)
          DETACH DELETE m, n
        `, { 
          phones: this.createdPhones,
          protectedPhone: PROTECTED_PHONE
        });
      }

      if (this.createdAccountIDs.length > 0) {
        logger.info(`Cleaning up ${this.createdAccountIDs.length} tracked test accounts in search space`);
        await session.run(`
          MATCH (a:Account) WHERE a.accountID IN $accountIDs
          AND NOT a.accountHandle IN $protectedAccounts
          DETACH DELETE a
        `, { 
          accountIDs: this.createdAccountIDs,
          protectedAccounts: PROTECTED_ACCOUNTS
        });
      }

      logger.info("Search space cleanup completed successfully");
    } catch (error) {
      logger.error("Error cleaning up search space:", error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Clean up all tracked test data
   */
  static async cleanupMembers() {
    if (this.createdMemberIDs.length === 0 && 
        this.createdPhones.length === 0 && 
        this.createdAccountIDs.length === 0) {
      return;
    }

    try {
      // Clean up both spaces
      await Promise.all([
        this.cleanupLedgerSpace(),
        this.cleanupSearchSpace()
      ]);
    } finally {
      // Reset tracking arrays
      this.resetTracking();
    }
  }

  /**
   * Reset tracking without cleanup
   * Useful when tests need to manage their own cleanup timing
   */
  static resetTracking() {
    this.createdMemberIDs = [];
    this.createdPhones = [];
    this.createdAccountIDs = [];
  }
}
