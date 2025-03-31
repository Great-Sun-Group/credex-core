import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../core-cron/constants/denominations";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface AccountProperties {
  accountID: string;
  accountType: string;
  accountName: string;
  accountHandle: string;
  defaultDenom: string;
  DCOgiveInCXX: number | null;
  DCOdenom: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateAccountResult {
  success: boolean;
  data?: {
    accountID: string;
    accountProperties: AccountProperties;
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * CreateAccountService
 *
 * Creates a new account for a member with optional DCO participation settings.
 * Validates membership tier requirements and account limits.
 *
 * @param ownerID - The ID of the member who will own the account
 * @param accountType - The type of account to create
 * @param accountName - The name of the account
 * @param accountHandle - The unique handle for the account
 * @param defaultDenom - The default denomination for the account
 * @param DCOgiveInCXX - Optional DCO give rate in CXX
 * @param DCOdenom - Optional DCO denomination
 * @returns CreateAccountResult containing the created account details
 * @throws AccountError for validation and business logic errors
 */
export async function CreateAccountService(
  ownerID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string,
  DCOgiveInCXX: number | null = null,
  DCOdenom: string | null = null
): Promise<CreateAccountResult> {
  logger.debug("CreateAccountService called", {
    ownerID,
    accountType,
    accountName,
    accountHandle,
    defaultDenom,
    DCOgiveInCXX,
    DCOdenom,
  });

  // Validate denomination
  if (!getDenominations({ code: defaultDenom }).length) {
    return {
      success: false,
      message: `Invalid default denomination: ${defaultDenom}`,
      error: {
        code: "INVALID_DENOMINATION",
        details: "The provided denomination is not supported"
      }
    };
  }

  // Validate DCO denomination if provided
  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    return {
      success: false,
      message: `Invalid DCO denomination: ${DCOdenom}`,
      error: {
        code: "INVALID_DCO_DENOMINATION",
        details: "The provided DCO denomination is not supported"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check membership tier and account limits
    const tierCheck = await ledgerSpaceSession.executeRead(async (tx) => {
      const result = await tx.run(
        `
        MATCH (member:Member{ memberID: $ownerID })
        OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
        RETURN
          member.memberTier AS memberTier,
          COUNT(account) AS numAccounts
        `,
        { ownerID }
      );

      if (result.records.length === 0) {
        return {
          success: false,
          message: "Member not found",
          error: {
            code: "MEMBER_NOT_FOUND",
            details: "The specified member does not exist"
          }
        };
      }

      return {
        memberTier: result.records[0].get("memberTier"),
        numAccounts: result.records[0].get("numAccounts").toNumber(),
      };
    });

    // Handle member not found case
    if ('success' in tierCheck && !tierCheck.success) {
      return tierCheck as CreateAccountResult;
    }

    if (tierCheck.memberTier <= 2 && tierCheck.numAccounts >= 2) {
      return {
        success: false,
        message: "Account creation not permitted on current membership tier",
        error: {
          code: "TIER_LIMIT_EXCEEDED",
          details: "Your current membership tier allows only one account. Please upgrade to create additional accounts."
        }
      };
    }

    // Create the account
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // First check if handle is already in use
      const handleCheck = await tx.run(
        `
        MATCH (account:Account { accountHandle: $accountHandle })
        RETURN account.accountHandle
        `,
        { accountHandle }
      );

      if (handleCheck.records.length > 0) {
        return {
          success: false,
          message: `Account handle '${accountHandle}' is already in use`,
          error: {
            code: "HANDLE_EXISTS",
            details: "Please choose a different account handle"
          }
        };
      }

      const createResult = await tx.run(
        `
        MATCH (daynode:Daynode { Active: true })
        MATCH (owner:Member { memberID: $ownerID })
        CREATE (owner)-[:OWNS]->(account:Account {
          accountType: $accountType,
          accountName: $accountName,
          accountHandle: $accountHandle,
          defaultDenom: $defaultDenom,
          DCOgiveInCXX: $DCOgiveInCXX,
          DCOdenom: $DCOdenom,
          accountID: randomUUID(),
          queueStatus: "PENDING_ACCOUNT",
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        CREATE
          (owner)-[:AUTHORIZED_FOR]->
          (account)
          -[:SEND_OFFERS_TO]->(owner)
        RETURN account {.*} as accountProperties
        `,
        {
          ownerID,
          accountType,
          accountName,
          accountHandle,
          defaultDenom,
          DCOgiveInCXX,
          DCOdenom,
        }
      );

      if (createResult.records.length === 0) {
        return {
          success: false,
          message: "Failed to create account",
          error: {
            code: "CREATE_FAILED",
            details: "An error occurred while creating the account"
          }
        };
      }

      const accountProperties = createResult.records[0].get(
        "accountProperties"
      ) as AccountProperties;

      logger.info("Account created successfully", {
        accountID: accountProperties.accountID,
        accountType,
        ownerID,
      });

      return {
        success: true,
        data: {
          accountID: accountProperties.accountID,
          accountProperties,
        },
        message: `Account "${accountName}" created successfully with default denomination ${defaultDenom}`
      };
    });

    return result;
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateAccountService", {
      error: handledError.message,
      code: handledError.code,
      ownerID,
      accountType,
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
    logger.debug("Exiting CreateAccountService", { ownerID });
  }
}
