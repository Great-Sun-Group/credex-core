import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { generateToken } from "../../../../config/authenticate";
import { MemberError, handleServiceError, createErrorDetails } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { memberDashboardService } from "../../../utils/dashboardUtils";

import { passwordService } from "./PasswordService";

interface MemberProperties {
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberHandle: string;
  memberTier: number;
  passwordHash?: string;
}

interface LoginRequest {
  phone: string;
  password?: string;
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
export async function LoginMemberService(request: LoginRequest): Promise<LoginResult> {
  logger.debug("Entering LoginMemberService", { phone: request.phone });

  if (!request.phone) {
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
    // Find member by phone and get password hash if exists
    const memberResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const result = await tx.run(
        `
        MATCH (m:Member {phone: $phone})
        OPTIONAL MATCH (m)-[:AUTHORIZED_FOR]->(a:Account)
        RETURN 
          m.memberID as memberID, 
          m.passwordHash as passwordHash,
          collect(a.accountID) as accountIDS
        `,
        { phone: request.phone }
      );
      return result.records[0];
    });

    if (!memberResult) {
      logger.warn("Login attempt failed - Member not found", { phone: request.phone });
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
    const storedPasswordHash = memberResult.get("passwordHash");

    // Handle v2 login attempt
    if (request.password) {
      // Check if this is a v1 user (no password hash)
      if (!storedPasswordHash) {
        logger.warn("V2 login attempt for v1 account", { memberID });
        return {
          success: false,
          message: "Password is required for this account",
          error: {
            code: "PASSWORD_REQUIRED",
            details: "This account requires password setup to use v2 API endpoints"
          }
        };
      }

      // This is a v2 user - verify password
      const isPasswordValid = await passwordService.verifyPassword(
        request.password,
        storedPasswordHash
      );

      if (!isPasswordValid) {
        logger.warn("Login attempt failed - Invalid password", { memberID });
        return {
          success: false,
          message: "Invalid credentials",
          error: {
            code: "INVALID_CREDENTIALS",
            details: "Invalid phone number or password",
          },
        };
      }
    } else if (storedPasswordHash) {
      // Only enforce password if explicitly configured
      return {
        success: false,
        message: "Password is required for this account",
        error: {
          code: "PASSWORD_REQUIRED",
          details: "This account requires password authentication",
        },
      };
    }

    // Get member data using dashboard service
    const memberData = await memberDashboardService.getMemberDashboardData(memberID);

    // Generate and update token with appropriate version and auth method
    const token = generateToken(memberID, {
      version: request.password ? 'v2' : 'v1',
      authMethod: request.password ? 'password' : 'phone_only'
    });
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
      phone: request.phone,
      accountCount: accountIDS.length,
      hasPassword: !!storedPasswordHash
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
      createErrorDetails(handledError, { phone: request.phone })
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
    logger.debug("Exiting LoginMemberService", { phone: request.phone });
  }
}
