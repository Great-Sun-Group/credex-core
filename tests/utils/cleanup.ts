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
      // First clean up all relationships and dependent nodes connected to test members
      if (this.createdMemberIDs.length > 0) {
        // Log counts before cleanup
        const beforeCounts = await session.run(`
          MATCH (m:Member) WHERE m.memberID IN $memberIDs
          AND NOT m.phone = "263778177125" // Exclude GREATSUN_TRUST
          OPTIONAL MATCH (m)-[r]->(n)
          RETURN 
            count(DISTINCT m) as memberCount,
            count(DISTINCT r) as relationshipCount,
            count(DISTINCT n) as connectedNodeCount
        `, { memberIDs: this.createdMemberIDs });
        
        logger.info("Ledger space counts before cleanup:", {
          ...beforeCounts.records[0].toObject()
        });

        // Clean up all connected data except Daynode and GREATSUN_TRUST
        await session.run(`
          MATCH (m:Member) WHERE m.memberID IN $memberIDs
          AND NOT m.phone = "263778177125" // Exclude GREATSUN_TRUST
          OPTIONAL MATCH (m)-[r1]-(n)
          WHERE NOT n:Daynode AND NOT n:Member { phone: "263778177125" }
          OPTIONAL MATCH (n)-[r2]-(x)
          WHERE NOT x:Daynode AND NOT x:Member { phone: "263778177125" }
          WITH m, r1, n, r2, x
          DETACH DELETE x, n, m
        `, { memberIDs: this.createdMemberIDs });
      }

      // Clean up by phone numbers as backup
      if (this.createdPhones.length > 0) {
        await session.run(`
          MATCH (m:Member) WHERE m.phone IN $phones
          AND NOT m.phone = "263778177125" // Exclude GREATSUN_TRUST
          OPTIONAL MATCH (m)-[r1]-(n)
          WHERE NOT n:Daynode AND NOT n:Member { phone: "263778177125" }
          OPTIONAL MATCH (n)-[r2]-(x)
          WHERE NOT x:Daynode AND NOT x:Member { phone: "263778177125" }
          WITH m, r1, n, r2, x
          DETACH DELETE x, n, m
        `, { phones: this.createdPhones });
      }

      // Clean up any orphaned accounts except GREATSUN_TRUST accounts
      if (this.createdAccountIDs.length > 0) {
        await session.run(`
          MATCH (a:Account) WHERE a.accountID IN $accountIDs
          AND NOT a.accountHandle IN ["GREATSUN_TRUST_CAD", "GREATSUN_TRUST_USD"]
          OPTIONAL MATCH (a)-[r]-(n)
          WHERE NOT n:Daynode AND NOT n:Member { phone: "263778177125" }
          DETACH DELETE a, n
        `, { accountIDs: this.createdAccountIDs });
      }

      // Verify cleanup
      const afterCounts = await session.run(`
        MATCH (m:Member) 
        WHERE m.memberID IN $memberIDs OR m.phone IN $phones
        RETURN count(m) as remainingMembers
      `, { 
        memberIDs: this.createdMemberIDs,
        phones: this.createdPhones
      });

      const remaining = afterCounts.records[0].get('remainingMembers').toNumber();
      if (remaining > 0) {
        logger.warn(`Found ${remaining} remaining test members after cleanup`);
      } else {
        logger.info("Ledger space cleanup successful");
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
      // Clean up members and accounts in search space
      if (this.createdMemberIDs.length > 0) {
        await session.run(`
          MATCH (m:Member) WHERE m.memberID IN $memberIDs
          OPTIONAL MATCH (m)-[r]-(n)
          DETACH DELETE m, n
        `, { memberIDs: this.createdMemberIDs });
      }

      if (this.createdPhones.length > 0) {
        await session.run(`
          MATCH (m:Member) WHERE m.phone IN $phones
          OPTIONAL MATCH (m)-[r]-(n)
          DETACH DELETE m, n
        `, { phones: this.createdPhones });
      }

      if (this.createdAccountIDs.length > 0) {
        await session.run(`
          MATCH (a:Account) WHERE a.accountID IN $accountIDs
          DETACH DELETE a
        `, { accountIDs: this.createdAccountIDs });
      }

      logger.info("Search space cleanup completed");
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
