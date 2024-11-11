import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../core-cron/constants/denominations";
import { MemberError, handleServiceError, isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface MemberData {
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
  createdAt: string;
}

interface OnboardMemberResult {
  success: boolean;
  data?: MemberData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * OnboardMemberService
 *
 * Handles the creation of new member accounts. Creates a new member with:
 * - Initial tier 1 status
 * - Phone number as member handle
 * - Default denomination
 * - Creation timestamp
 *
 * @param firstname - Member's first name
 * @param lastname - Member's last name
 * @param phone - Member's phone number (used as handle)
 * @param defaultDenom - Member's default denomination
 * @param requestId - The ID of the HTTP request
 * @returns OnboardMemberResult containing the created member details
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
    requestId,
  });

  // Validate required parameters
  if (!firstname || !lastname || !phone || !defaultDenom) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "firstname, lastname, phone, and defaultDenom are required"
      }
    };
  }

  // Validate denomination
  if (!getDenominations({ code: defaultDenom }).length) {
    return {
      success: false,
      message: `Invalid denomination: ${defaultDenom}`,
      error: {
        code: "INVALID_DENOMINATION",
        details: "The provided denomination is not supported"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Creating new member", { requestId });
    
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (daynode:Daynode { Active: true })
        CREATE (member:Member {
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
          member {
            .memberID,
            .firstname,
            .lastname,
            .phone,
            .memberHandle,
            .defaultDenom,
            .memberTier,
            toString(.createdAt) AS createdAt
          } as memberData
      `;

      const queryResult = await tx.run(query, {
        firstname,
        lastname,
        defaultDenom,
        phone,
      });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "CREATE_FAILED"
        };
      }

      const memberData = queryResult.records[0].get("memberData");
      return {
        success: true,
        data: memberData
      };
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Failed to create member",
        error: {
          code: "CREATE_FAILED",
          details: "An error occurred while creating the member"
        }
      };
    }

    logger.info("Member onboarded successfully", {
      memberID: result.data.memberID,
      phone,
      requestId,
    });

    return {
      success: true,
      data: result.data,
      message: `Member ${firstname} ${lastname} onboarded successfully with default denomination ${defaultDenom}`
    };

  } catch (error: unknown) {
    // Handle Neo4j constraint violations
    if (isNeo4jError(error)) {
      if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
        if (error.message.includes("phone")) {
          return {
            success: false,
            message: "Phone number already in use",
            error: {
              code: "DUPLICATE_PHONE",
              details: "A member with this phone number already exists"
            }
          };
        }
        if (error.message.includes("memberHandle")) {
          return {
            success: false,
            message: "Member handle already in use",
            error: {
              code: "DUPLICATE_HANDLE",
              details: "A member with this handle already exists"
            }
          };
        }
        return {
          success: false,
          message: "Required unique field not unique",
          error: {
            code: "DUPLICATE_FIELD",
            details: "A unique field constraint was violated"
          }
        };
      }
    }

    logger.error("Unexpected error in OnboardMemberService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });

    return {
      success: false,
      message: "Failed to onboard member",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while onboarding member"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting OnboardMemberService", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });
  }
}
