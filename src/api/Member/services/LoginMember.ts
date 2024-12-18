import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { generateToken } from "../../../../config/authenticate";
import { MemberError, handleServiceError, createErrorDetails } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface MemberProperties {
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberHandle: string;
  memberTier: number;
}

interface LoginResult {
  success: boolean;
  data?: {
    token: string;
    memberID: string;
    memberTier: number;
    remainingAvailableUSD: number;
    accountIDS: string[];
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * LoginMemberService
 * 
 * Authenticates a member using their phone number, generates a new token,
 * and returns member dashboard data.
 * 
 * @param phone - The member's phone number
 * @returns LoginResult containing token and dashboard data if successful
 * @throws MemberError for validation and business logic errors
 */
export async function LoginMemberService(
  phone: string
): Promise<LoginResult> {
  logger.debug("Entering LoginMemberService", { phone });

  if (!phone) {
    return {
      success: false,
      message: "Phone number is required",
      error: {
        code: "MISSING_PHONE",
        details: "Phone number parameter must be provided"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // Find the member and get dashboard data
      const memberResult = await tx.run(
        `
        MATCH (m:Member {phone: $phone})
        OPTIONAL MATCH (m)-[:AUTHORIZED_FOR]->(a:Account)
        WITH m, collect(a.accountID) as accountIDS
        MATCH (daynode:Daynode { Active: true })
        RETURN {
          memberID: m.memberID,
          firstname: m.firstname,
          lastname: m.lastname,
          phone: m.phone,
          memberHandle: m.memberHandle,
          memberTier: m.memberTier,
          accountIDS: accountIDS,
          remainingAvailableUSD: 
            CASE
              WHEN m.memberTier = 1 THEN 100
              WHEN m.memberTier = 2 THEN 1000
              WHEN m.memberTier = 3 THEN 10000
              ELSE 0
            END
        } as memberData
        `,
        { phone }
      );

      if (memberResult.records.length === 0) {
        return {
          success: false,
          message: "Member not found",
          error: {
            code: "NOT_FOUND",
            details: "No member exists with the provided phone number"
          }
        };
      }

      const memberData = memberResult.records[0].get("memberData");
      
      // Validate member data
      if (!memberData.memberID) {
        return {
          success: false,
          message: "Invalid member data - missing memberID",
          error: {
            code: "INVALID_DATA",
            details: "Member data is missing required fields"
          }
        };
      }

      const token = generateToken(memberData.memberID);

      // Update the member's token
      const updateResult = await tx.run(
        `
        MATCH (m:Member {memberID: $memberID})
        SET
          m.token = $token,
          m.lastLoginAt = datetime()
        RETURN m.memberID
        `,
        { memberID: memberData.memberID, token }
      );

      if (updateResult.records.length === 0) {
        return {
          success: false,
          message: "Failed to update member token",
          error: {
            code: "TOKEN_UPDATE_FAILED",
            details: "Could not update member's authentication token"
          }
        };
      }

      logger.info("Member logged in successfully", {
        memberID: memberData.memberID,
        phone: memberData.phone,
        accountCount: memberData.accountIDS.length
      });

      return {
        success: true,
        data: {
          token,
          memberID: memberData.memberID,
          memberTier: memberData.memberTier,
          remainingAvailableUSD: memberData.remainingAvailableUSD,
          accountIDS: memberData.accountIDS
        },
        message: "Login successful"
      };
    });

    return result;

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in LoginMemberService", createErrorDetails(handledError, { phone }));
    
    return {
      success: false,
      message: handledError.message,
      error: {
        code: handledError.code || "INTERNAL_ERROR",
        details: handledError.message
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting LoginMemberService", { phone });
  }
}
