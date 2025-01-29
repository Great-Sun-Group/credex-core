import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../core-cron/constants/denominations";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { CreateAccountService } from "./CreateAccount";

interface TrustAccountProperties {
  accountID: string;
  accountType: string;
  accountName: string;
  accountHandle: string;
  subtype: string;
  denomination: string;
  bankFields?: {
    jurisdiction: string;
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateTrustAccountResult {
  success: boolean;
  data?: {
    accountID: string;
    accountProperties: TrustAccountProperties;
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * CreateTrustAccountService
 *
 * Creates a new trust account. Only available to members with tier 5.
 * For BANK subtype, requires jurisdiction-specific bank account details.
 *
 * @param ownerID - The ID of the member who will own the account
 * @param accountName - The name of the account
 * @param accountHandle - The unique handle for the account
 * @param subtype - The subtype of trust account (BANK or VAULT)
 * @param denomination - The denomination for the account
 * @param bankFields - Required for BANK subtype, contains jurisdiction-specific bank details
 * @returns CreateTrustAccountResult containing the created account details
 * @throws AccountError for validation and business logic errors
 */
export async function CreateTrustAccountService(
  ownerID: string,
  accountName: string,
  accountHandle: string,
  subtype: string,
  denomination: string,
  bankFields?: {
    jurisdiction: string;
    [key: string]: string;
  }
): Promise<CreateTrustAccountResult> {
  logger.debug("CreateTrustAccountService called", {
    ownerID,
    accountName,
    accountHandle,
    subtype,
    denomination,
  });

  // Validate denomination
  if (!getDenominations({ code: denomination }).length) {
    return {
      success: false,
      message: `Invalid denomination: ${denomination}`,
      error: {
        code: "INVALID_DENOMINATION",
        details: "The provided denomination is not supported"
      }
    };
  }

  // Validate subtype and bank fields
  if (subtype === "BANK" && !bankFields) {
    return {
      success: false,
      message: "Bank fields are required for BANK subtype",
      error: {
        code: "MISSING_BANK_FIELDS",
        details: "Bank account details must be provided for BANK subtype"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check membership tier
    const tierCheck = await ledgerSpaceSession.executeRead(async (tx) => {
      const result = await tx.run(
        `
        MATCH (member:Member { memberID: $ownerID })
        RETURN member.memberTier AS memberTier
        `,
        { ownerID }
      );

      if (result.records.length === 0) {
        throw new AccountError("Member not found", "MEMBER_NOT_FOUND");
      }

      return result.records[0].get("memberTier");
    });

    if (tierCheck < 5) {
      return {
        success: false,
        message: "Trust account creation requires membership tier 5",
        error: {
          code: "INSUFFICIENT_TIER",
          details: "You must be a tier 5 member to create trust accounts"
        }
      };
    }

    // Create base account using CreateAccountService
    const baseAccountResult = await CreateAccountService(
      ownerID,
      "TRUST", // accountType
      accountName,
      accountHandle,
      denomination, // defaultDenom
      null, // DCOgiveInCXX
      null  // DCOdenom
    );

    if (!baseAccountResult.success) {
      return {
        success: false,
        message: baseAccountResult.message,
        error: baseAccountResult.error
      };
    }

    if (!baseAccountResult.data) {
      return {
        success: false,
        message: "Base account creation failed",
        error: {
          code: "CREATE_FAILED",
          details: "Failed to get account data after creation"
        }
      };
    }

    // Update the account with trust-specific fields
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const updateResult = await tx.run(
        `
        MATCH (account:Account { accountID: $accountID })
        SET 
          account.subtype = $subtype,
          account.bankFields = $bankFields
        RETURN account {.*} as accountProperties
        `,
        {
          accountID: baseAccountResult.data!.accountID,
          subtype,
          bankFields: bankFields ? JSON.stringify(bankFields) : null,
        }
      );

      if (updateResult.records.length === 0) {
        return {
          success: false,
          message: "Failed to update trust account fields",
          error: {
            code: "UPDATE_FAILED",
            details: "An error occurred while setting trust-specific fields"
          }
        };
      }

      const rawProperties = updateResult.records[0].get("accountProperties");
      const accountProperties = {
        ...rawProperties,
        bankFields: rawProperties.bankFields ? JSON.parse(rawProperties.bankFields) : null
      } as TrustAccountProperties;

      logger.info("Trust account created and updated successfully", {
        accountID: accountProperties.accountID,
        subtype,
        ownerID,
      });

      return {
        success: true,
        data: {
          accountID: accountProperties.accountID,
          accountProperties,
        },
        message: `Trust account "${accountName}" created successfully with denomination ${denomination}`
      };
    });

    return result;
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateTrustAccountService", {
      error: handledError.message,
      code: handledError.code,
      ownerID,
      accountName,
    });

    return {
      success: false,
      message: handledError.message,
      error: {
        code: handledError.code || "INTERNAL_ERROR",
        details: handledError instanceof Error ? handledError.message : "An unknown error occurred"
      }
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CreateTrustAccountService", { ownerID });
  }
}
