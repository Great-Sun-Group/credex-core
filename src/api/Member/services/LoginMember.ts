import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { generateToken } from "../../../../config/authenticate";
import { MemberError, handleServiceError, createErrorDetails } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { memberDashboardService } from "../../../utils/dashboardUtils";

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
export async function LoginMemberService(phone: string): Promise<LoginResult> {
  logger.debug("Entering LoginMemberService", { phone });

  if (!phone) {
    return {
      success: false,
      message: "Phone number is required",
      error: {
        code: "MISSING_PHONE",
        details: "Phone number parameter must be provided",
      },
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Find member by phone
    const memberResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const result = await tx.run(
        `
        MATCH (m:Member {phone: $phone})
        OPTIONAL MATCH (m)-[:AUTHORIZED_FOR]->(a:Account)
        RETURN m.memberID as memberID, collect(a.accountID) as accountIDS
        `,
        { phone }
      );
      return result.records[0];
    });

    if (!memberResult) {
      return {
        success: false,
        message: "Member not found",
        error: {
          code: "NOT_FOUND",
          details: "No member exists with the provided phone number",
        },
      };
    }

    const memberID = memberResult.get("memberID");
    const accountIDS = memberResult.get("accountIDS");

    // Get member data using dashboard service
    const memberData = await memberDashboardService.getMemberDashboardData(memberID);

    // Generate and update token
    const token = generateToken(memberID);
    await ledgerSpaceSession.executeWrite(async (tx) => {
      await tx.run(
        `
        MATCH (m:Member {memberID: $memberID})
        SET
          m.token = $token,
          m.lastLoginAt = datetime()
        `,
        { memberID, token }
      );
    });

    logger.info("Member logged in successfully", {
      memberID,
      phone,
      accountCount: accountIDS.length,
    });

    return {
      success: true,
      data: {
        token,
        memberID,
        memberTier: memberData.memberTier,
        remainingAvailableUSD: memberData.remainingAvailableUSD || 0,
        accountIDS,
      },
      message: "Login successful",
    };
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error(
      "Error in LoginMemberService",
      createErrorDetails(handledError, { phone })
    );

    return {
      success: false,
      message: handledError.message,
      error: {
        code: handledError.code || "INTERNAL_ERROR",
        details: handledError.message,
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting LoginMemberService", { phone });
  }
}
