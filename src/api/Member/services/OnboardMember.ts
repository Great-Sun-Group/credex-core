import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../core-cron/constants/denominations";
import { MemberError, handleServiceError, isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

import { passwordService } from './PasswordService';

interface MemberData {
  memberID: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
  createdAt: string;
  version: string;
  authMethod: string;
  passwordHash?: string;
  passwordLastChanged?: string;
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
  password: string | undefined,
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
    logger.error("Missing required parameters", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId,
    });
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
    logger.error("Invalid denomination", {
      defaultDenom,
      requestId,
    });
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
    
    // First verify daynode exists
    const daynodeCheck = await ledgerSpaceSession.run(
      "MATCH (daynode:Daynode { Active: true }) RETURN daynode"
    );
    
    if (daynodeCheck.records.length === 0) {
      logger.error("No active daynode found", { requestId });
      return {
        success: false,
        message: "No active daynode found",
        error: {
          code: "NO_DAYNODE",
          details: "Cannot create member without an active daynode"
        }
      };
    }

    logger.debug("Found active daynode, proceeding with member creation", { requestId });
    
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // If password is provided, validate and hash it
    let passwordHash: string | undefined;
    let passwordLastChanged: string | undefined;

    if (password) {
      const validation = passwordService.validatePassword(password);
      if (!validation.isValid) {
        logger.error("Invalid password", {
          errors: validation.errors,
          requestId,
        });
        return {
          success: false,
          message: "Invalid password",
          error: {
            code: "INVALID_PASSWORD",
            details: validation.errors?.join(", ") || "Password validation failed"
          }
        };
      }

      const { hash } = await passwordService.hashPassword(password);
      passwordHash = hash;
      passwordLastChanged = new Date().toISOString();
    }

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
          updatedAt: datetime(),
          version: $version,
          authMethod: $authMethod,
          otpVerified: false
          ${passwordHash ? ', passwordHash: $passwordHash' : ''}
          ${passwordLastChanged ? ', passwordLastChanged: $passwordLastChanged' : ''}
        })-[:CREATED_ON]->(daynode)
        RETURN
          member {
            memberID: member.memberID,
            firstname: member.firstname,
            lastname: member.lastname,
            phone: member.phone,
            memberHandle: member.memberHandle,
            defaultDenom: member.defaultDenom,
            memberTier: member.memberTier,
            createdAt: toString(member.createdAt),
            passwordHash: member.passwordHash,
            passwordLastChanged: toString(member.passwordLastChanged),
            version: member.version,
            authMethod: member.authMethod
          } as memberData
      `;

      logger.debug("Executing member creation query", {
        requestId,
        params: { firstname, lastname, phone, defaultDenom, version: password ? 'v2' : 'v1', authMethod: password ? 'password' : 'phone_only' }
      });

      const queryResult = await tx.run(query, {
        firstname,
        lastname,
        defaultDenom,
        phone,
        version: password ? 'v2' : 'v1',
        authMethod: password ? 'password' : 'phone_only',
        ...(passwordHash && { passwordHash }),
        ...(passwordLastChanged && { passwordLastChanged })
      });

      if (queryResult.records.length === 0) {
        logger.error("Member creation query returned no records", { requestId });
        return {
          success: false,
          error: "CREATE_FAILED"
        };
      }

      const memberData = queryResult.records[0].get("memberData");
      logger.debug("Member creation query successful", {
        requestId,
        memberData
      });
      return {
        success: true,
        data: memberData
      };
    });

    if (!result.success || !result.data) {
      logger.error("Failed to create member", {
        requestId,
        result
      });
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
    // Log the full error details
    logger.error("Detailed error in OnboardMemberService", {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorDetails: error instanceof Error ? {
        ...error,
        stack: error.stack
      } : error,
      requestId,
      context: {
        firstname,
        lastname,
        phone,
        defaultDenom
      }
    });

    // Handle Neo4j constraint violations
    if (isNeo4jError(error)) {
      logger.error("Neo4j error details", {
        code: error.code,
        message: error.message,
        requestId
      });

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
