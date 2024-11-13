import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface MemberData {
  memberID: string;
  memberName: string;
  memberHandle: string;
  firstname: string;
  lastname: string;
}

interface GetMemberResult {
  success: boolean;
  data?: MemberData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetMemberByHandleService
 * 
 * Retrieves member information using their handle.
 * Returns basic member details without sensitive information.
 * 
 * @param memberHandle - The unique handle of the member to retrieve
 * @returns GetMemberResult containing member details if found
 */
export async function GetMemberByHandleService(
  memberHandle: string
): Promise<GetMemberResult> {
  logger.debug("GetMemberByHandleService called", { memberHandle });

  if (!memberHandle) {
    return {
      success: false,
      message: "Member handle is required",
      error: {
        code: "MISSING_HANDLE",
        details: "Member handle cannot be empty"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query", { memberHandle });
    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (member:Member { memberHandle: $memberHandle })
        RETURN
          member.memberID AS memberID,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.memberHandle AS memberHandle
        `,
        { memberHandle }
      );
    });

    if (!result.records.length) {
      logger.info("Member not found in database", { memberHandle });
      return {
        success: false,
        message: "Member not found",
        error: {
          code: "NOT_FOUND",
          details: "No member exists with the provided handle"
        }
      };
    }

    const record = result.records[0];
    const memberData: MemberData = {
      memberID: record.get("memberID"),
      firstname: record.get("firstname"),
      lastname: record.get("lastname"),
      memberHandle: record.get("memberHandle"),
      memberName: `${record.get("firstname")} ${record.get("lastname")}`
    };

    logger.info("Member retrieved successfully", {
      memberID: memberData.memberID,
      memberHandle
    });

    return {
      success: true,
      data: memberData,
      message: `Found member: ${memberData.memberName}`
    };

  } catch (error) {
    logger.error("Error fetching member data from database", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberHandle
    });

    return {
      success: false,
      message: "Failed to retrieve member information",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving member data"
      }
    };

  } finally {
    logger.debug("Closing database session", { memberHandle });
    await ledgerSpaceSession.close();
  }
}
