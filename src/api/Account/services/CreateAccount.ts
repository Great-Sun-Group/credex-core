import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
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
}

/**
 * CreateAccountService
 * 
 * Creates a new account for a member with optional DCO participation settings.
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
    throw new AccountError(
      "Invalid default denomination",
      "INVALID_DENOMINATION",
      400
    );
  }

  // Validate DCO denomination if provided
  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    throw new AccountError(
      "Invalid DCO denomination",
      "INVALID_DCO_DENOMINATION",
      400
    );
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
        throw new AccountError(
          "Member not found",
          "MEMBER_NOT_FOUND",
          404
        );
      }

      return {
        memberTier: result.records[0].get("memberTier"),
        numAccounts: result.records[0].get("numAccounts").toNumber()
      };
    });

    if (tierCheck.memberTier <= 2 && tierCheck.numAccounts >= 1) {
      throw new AccountError(
        "Account creation not permitted on current membership tier",
        "TIER_LIMIT_EXCEEDED",
        403
      );
    }

    // Create the account
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
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
        throw new AccountError(
          "Failed to create account",
          "CREATE_FAILED",
          500
        );
      }

      const accountProperties = createResult.records[0].get("accountProperties") as AccountProperties;

      logger.info("Account created successfully", {
        accountID: accountProperties.accountID,
        accountType,
        ownerID,
      });

      return {
        success: true,
        data: {
          accountID: accountProperties.accountID,
          accountProperties
        },
        message: "Account created successfully"
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
      accountName
    });

    return {
      success: false,
      message: handledError.message
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CreateAccountService", { ownerID });
  }
}
