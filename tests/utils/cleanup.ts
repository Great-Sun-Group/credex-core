import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j";

/**
 * Utility class for cleaning up test data
 */
export class TestCleanup {
  private static createdMemberIDs: string[] = [];
  private static createdPhones: string[] = [];

  /**
   * Track a member for cleanup
   */
  static trackMember(memberID: string, phone: string) {
    this.createdMemberIDs.push(memberID);
    this.createdPhones.push(phone);
  }

  /**
   * Clean up all tracked members
   */
  static async cleanupMembers() {
    if (this.createdMemberIDs.length === 0 && this.createdPhones.length === 0) {
      return;
    }

    // Clean up in ledger space
    const ledgerSession = ledgerSpaceDriver.session();
    try {
      // Delete members by ID
      if (this.createdMemberIDs.length > 0) {
        await ledgerSession.run(
          'MATCH (m:Member) WHERE m.memberID IN $memberIDs DETACH DELETE m',
          { memberIDs: this.createdMemberIDs }
        );
      }

      // Delete members by phone (in case memberID wasn't captured)
      if (this.createdPhones.length > 0) {
        await ledgerSession.run(
          'MATCH (m:Member) WHERE m.phone IN $phones DETACH DELETE m',
          { phones: this.createdPhones }
        );
      }
    } finally {
      await ledgerSession.close();
    }

    // Clean up in search space
    const searchSession = searchSpaceDriver.session();
    try {
      // Delete members by ID
      if (this.createdMemberIDs.length > 0) {
        await searchSession.run(
          'MATCH (m:Member) WHERE m.memberID IN $memberIDs DETACH DELETE m',
          { memberIDs: this.createdMemberIDs }
        );
      }

      // Delete members by phone (in case memberID wasn't captured)
      if (this.createdPhones.length > 0) {
        await searchSession.run(
          'MATCH (m:Member) WHERE m.phone IN $phones DETACH DELETE m',
          { phones: this.createdPhones }
        );
      }
    } finally {
      await searchSession.close();
    }

    // Reset tracking arrays
    this.createdMemberIDs = [];
    this.createdPhones = [];
  }

  /**
   * Reset tracking without cleanup
   * Useful when tests need to manage their own cleanup timing
   */
  static resetTracking() {
    this.createdMemberIDs = [];
    this.createdPhones = [];
  }
}
