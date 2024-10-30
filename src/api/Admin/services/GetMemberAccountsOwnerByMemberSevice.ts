import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

export default async function GetMemberAccountsOwnerByMemberService(
  memberID: string
) {
  logger.debug("GetMemberAccountsOwnerByMemberService entered", { memberID });

  if (!memberID) {
    logger.warn("MemberID is required but not provided");
    return {
      message: "The memberID is required",
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching accounts owned by member", { memberID });
    const accountsOwnedByMemberResult = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberID:$memberID})-[:OWNS] ->(account:Account)
        RETURN
          account.accountID AS accountID,
          account.accountHandle AS accountHandle,
          account.accountName AS accountName,
          account.defaultDenom AS defaultDenom,
          account.accountType AS accountType,
          account.queueStatus AS queueStatus,
          account.createdAt AS createdAt,
          account.updatedAt AS updatedAt
      `,
      { memberID }
    );

    const accountsOwnedByMember = accountsOwnedByMemberResult.records.map(
      (record) => {
        return {
          accountID: record.get("accountID"),
          accountHandle: record.get("accountHandle"),
          accountName: record.get("accountName"),
          defaultDenom: record.get("defaultDenom"),
          accountType: record.get("accountType"),
          queueStatus: record.get("queueStatus"),
          createdAt: record.get("createdAt"),
          updatedAt: record.get("updatedAt"),
        };
      }
    );

    if (!accountsOwnedByMember.length) {
      logger.info("No accounts found for member", { memberID });
      return {
        message: "Accounts owned by member not found",
      };
    }

    logger.info("Accounts owned by member fetched successfully", {
      memberID,
      accountCount: accountsOwnedByMember.length,
    });
    logger.debug("GetMemberAccountsOwnerByMemberService exiting successfully", {
      memberID,
    });
    return {
      message: "Accounts owned by member fetched successfully",
      data: accountsOwnedByMember,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error fetching accounts owned by member:", {
        memberID,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error("Unknown error fetching accounts owned by member:", {
        memberID,
        error: String(error),
      });
    }
    logger.debug("GetMemberAccountsOwnerByMemberService exiting with error", {
      memberID,
    });
    return {
      message: "Error fetching accounts owned by member",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
