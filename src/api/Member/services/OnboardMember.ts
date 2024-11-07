import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
import { isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface OnboardMemberResult {
  success: boolean;
  data?: {
    memberID: string;
    firstname: string;
    lastname: string;
    phone: string;
    defaultDenom: string;
  };
  message: string;
}

class MemberError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MemberError';
  }
}

/**
 * OnboardMemberService
 * 
 * This service handles the creation of new member accounts.
 * It validates input data and creates a new member with default tier 1.
 * 
 * @param firstname - Member's first name
 * @param lastname - Member's last name
 * @param phone - Member's phone number (used as handle)
 * @param defaultDenom - Member's default denomination
 * @param requestId - The ID of the HTTP request
 * @returns Object containing the created member details
 * @throws MemberError with specific error codes
 */
export async function OnboardMemberService(
  firstname: string,
  lastname: string,
  phone: string,
  defaultDenom: string,
  requestId: string
): Promise<OnboardMemberResult> {
  logger.debug("Entering OnboardMemberService", {
    firstname,
    lastname,
    phone,
    defaultDenom,
    requestId
  });

  if (!firstname || !lastname || !phone || !defaultDenom) {
    throw new MemberError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Validate denomination
    if (!getDenominations({ code: defaultDenom }).length) {
      throw new MemberError(
        `Invalid denomination: ${defaultDenom}`,
        "INVALID_DENOMINATION"
      );
    }

    logger.debug("Creating new member", { requestId });
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH (daynode:Daynode { Active: true })
        CREATE (member:Member{
          firstname: $firstname,
          lastname: $lastname,
          memberHandle: $phone,
          defaultDenom: $defaultDenom,
          phone: $phone,
          memberID: randomUUID(),
          memberTier: 1,
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        RETURN
          member.memberID AS memberID,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.phone AS phone,
          member.defaultDenom AS defaultDenom
        `,
        {
          firstname,
          lastname,
          defaultDenom,
          phone,
        }
      );
    });

    if (!result.records.length) {
      throw new MemberError("Failed to create member", "CREATE_FAILED");
    }

    const record = result.records[0];
    const memberData = {
      memberID: record.get("memberID"),
      firstname: record.get("firstname"),
      lastname: record.get("lastname"),
      phone: record.get("phone"),
      defaultDenom: record.get("defaultDenom")
    };

    logger.info("Member onboarded successfully", {
      memberID: memberData.memberID,
      phone,
      requestId
    });

    return {
      success: true,
      data: memberData,
      message: "Member onboarded successfully"
    };

  } catch (error) {
    if (error instanceof MemberError) {
      throw error;
    }

    if (isNeo4jError(error)) {
      if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
        if (error.message.includes("phone")) {
          throw new MemberError("Phone number already in use", "DUPLICATE_PHONE");
        }
        if (error.message.includes("memberHandle")) {
          throw new MemberError("Member handle already in use", "DUPLICATE_HANDLE");
        }
        throw new MemberError("Required unique field not unique", "DUPLICATE_FIELD");
      }
    }

    logger.error("Unexpected error in OnboardMemberService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    });

    throw new MemberError(
      `Failed to onboard member: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting OnboardMemberService", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    });
  }
}
