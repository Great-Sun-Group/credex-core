import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface UnauthorizeForAccountResult {
  success: boolean;
  data?: {
    accountID: string;
    memberIdUnauthorized: string;
  };
  message: string;
}

class AccountError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AccountError';
  }
}

/**
 * UnauthorizeForAccountService
 * 
 * This service handles removing authorization for a member to transact on behalf of an account.
 * 
 * @param memberIDtoBeUnauthorized - ID of the member to unauthorize
 * @param accountID - ID of the account to remove authorization from
 * @param ownerID - ID of the account owner
 * @param requestId - The ID of the HTTP request
 * @returns Object containing unauthorized result
 * @throws AccountError with specific error codes
 */
export async function UnauthorizeForAccountService(
  memberIDtoBeUnauthorized: string,
  accountID: string,
  ownerID: string,
  requestId: string
): Promise<UnauthorizeForAccountResult> {
  logger.debug("Entering UnauthorizeForAccountService", {
    memberIDtoBeUnauthorized,
    accountID,
    ownerID,
    requestId
  });

  if (!memberIDtoBeUnauthorized || !accountID || !ownerID) {
    throw new AccountError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing unauthorization query", { requestId });
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH
          (memberToUnauthorize:Member { memberID: $memberIDtoBeUnauthorized })
          -[authRel:AUTHORIZED_FOR]->(account:Account { accountID: $accountID })
          <-[:OWNS]-(owner:Member { memberID: $ownerID })
        DELETE authRel
        RETURN
          account.accountID AS accountID,
          memberToUnauthorize.memberID AS memberToUnauthorize
        `,
        {
          memberIDtoBeUnauthorized,
          accountID,
          ownerID,
        }
      );
    });

    if (!result.records.length) {
      // Check if it's because the account doesn't exist
      const accountExists = await ledgerSpaceSession.executeRead(async (tx) => {
        const query = `
          MATCH (account:Account { accountID: $accountID })
          RETURN account
        `;
        return tx.run(query, { accountID });
      });

      if (accountExists.records.length === 0) {
        throw new AccountError("Account not found", "NOT_FOUND");
      }

      // Check if it's because the member isn't authorized
      const isAuthorized = await ledgerSpaceSession.executeRead(async (tx) => {
        const query = `
          MATCH (member:Member { memberID: $memberID })
          -[:AUTHORIZED_FOR]->
          (account:Account { accountID: $accountID })
          RETURN member
        `;
        return tx.run(query, { 
          memberID: memberIDtoBeUnauthorized,
          accountID 
        });
      });

      if (isAuthorized.records.length === 0) {
        throw new AccountError(
          "Member is not authorized for this account",
          "NOT_AUTHORIZED"
        );
      }

      // If both exist but operation failed, it's an ownership issue
      throw new AccountError(
        "Not authorized to remove authorization",
        "UNAUTHORIZED"
      );
    }

    const record = result.records[0];

    logger.info("Account unauthorized successfully", {
      memberToUnauthorize: record.get("memberToUnauthorize"),
      accountID: record.get("accountID"),
      requestId
    });

    return {
      success: true,
      data: {
        accountID: record.get("accountID"),
        memberIdUnauthorized: record.get("memberToUnauthorize")
      },
      message: "Authorization removed successfully"
    };

  } catch (error) {
    if (error instanceof AccountError) {
      throw error;
    }

    logger.error("Unexpected error in UnauthorizeForAccountService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });

    throw new AccountError(
      `Failed to remove authorization: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting UnauthorizeForAccountService", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });
  }
}
