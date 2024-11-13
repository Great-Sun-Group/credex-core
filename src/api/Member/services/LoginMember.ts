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
  };
  message: string;
}

/**
 * LoginMemberService
 * 
 * Authenticates a member using their phone number and generates a new token.
 * 
 * @param phone - The member's phone number
 * @returns LoginResult containing token if successful
 * @throws MemberError for validation and business logic errors
 */
export async function LoginMemberService(
  phone: string
): Promise<LoginResult> {
  logger.debug("Entering LoginMemberService", { phone });

  if (!phone) {
    throw new MemberError(
      "Phone number is required",
      "MISSING_PHONE",
      400
    );
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // Find the member
      const memberResult = await tx.run(
        `
        MATCH (m:Member {phone: $phone})
        RETURN m {
          .memberID,
          .firstname,
          .lastname,
          .phone,
          .memberHandle,
          .memberTier
        } as member
        `,
        { phone }
      );

      if (memberResult.records.length === 0) {
        throw new MemberError(
          "Member not found",
          "NOT_FOUND",
          404
        );
      }

      const member = memberResult.records[0].get("member") as MemberProperties;
      
      // Validate member data
      if (!member.memberID) {
        throw new MemberError(
          "Invalid member data - missing memberID",
          "INVALID_DATA",
          500
        );
      }

      const token = generateToken(member.memberID);

      // Update the member's token
      const updateResult = await tx.run(
        `
        MATCH (m:Member {memberID: $memberID})
        SET
          m.token = $token,
          m.lastLoginAt = datetime()
        RETURN m.memberID
        `,
        { memberID: member.memberID, token }
      );

      if (updateResult.records.length === 0) {
        throw new MemberError(
          "Failed to update member token",
          "TOKEN_UPDATE_FAILED",
          500
        );
      }

      logger.info("Member logged in successfully", {
        memberID: member.memberID,
        phone: member.phone
      });

      return {
        success: true,
        data: {
          token,
          memberID: member.memberID
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
      message: handledError.message
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting LoginMemberService", { phone });
  }
}
