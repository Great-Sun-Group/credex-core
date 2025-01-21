import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface AuthorizeForAccountResult {
  success: boolean;
  data?: {
    accountID: string;
    memberIdAuthorized: string;
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
 * AuthorizeForAccountService
 * 
 * This service handles authorizing a member to transact on behalf of an account.
 * It validates membership tier requirements and authorization limits.
 * 
 * @param memberHandleToBeAuthorized - Handle of the member to authorize
 * @param accountID - ID of the account to authorize for
 * @param ownerID - ID of the account owner
 * @param requestId - The ID of the HTTP request
 * @returns Object containing authorization result
 * @throws AccountError with specific error codes
 */
export async function AuthorizeForAccountService(
  memberHandleToBeAuthorized: string,
  accountID: string,
  ownerID: string,
  requestId: string
): Promise<AuthorizeForAccountResult> {
  logger.debug("Entering AuthorizeForAccountService", {
    memberHandleToBeAuthorized,
    accountID,
    ownerID,
    requestId
  });

  if (!memberHandleToBeAuthorized || !accountID || !ownerID) {
    throw new AccountError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check membership tier
    logger.debug("Checking membership tier for authorization permission", { requestId });
    const getMemberTier = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (member:Member{ memberID: $ownerID })
        RETURN member.memberTier as memberTier
        `,
        { ownerID }
      );
    });

    if (getMemberTier.records.length === 0) {
      throw new AccountError("Owner not found", "NOT_FOUND");
    }

    const memberTier = getMemberTier.records[0].get("memberTier");
    if (memberTier <= 3) {
      logger.warn("Insufficient membership tier for authorization", {
        ownerID,
        memberTier,
        requestId
      });
      return {
        success: false,
        message: "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above."
      };
    }

    // Perform authorization
    logger.debug("Executing authorization query", { requestId });
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account { accountID: $accountID })
            <-[:OWNS]-(owner:Member { memberID: $ownerID })
        MATCH (memberToAuthorize:Member { memberHandle: $memberHandleToBeAuthorized })
        MATCH (:Member)-[currentAuthForRel:AUTHORIZED_FOR]->(account)
        WITH count (currentAuthForRel) AS numAuthorized, memberToAuthorize, account
        CALL apoc.do.when(
          numAuthorized >= 5,
          'RETURN "limitReached" AS message',
          'MERGE (memberToAuthorize)-[:AUTHORIZED_FOR]->(account)
            RETURN
              "accountAuthorized" AS message,
              account.accountID AS accountID,
              memberToAuthorize.memberID AS memberIDtoAuthorize',
          {
            numAuthorized: numAuthorized,
            memberToAuthorize: memberToAuthorize,
            account: account
          }
        )
        YIELD value
        RETURN
          value.message AS message,
          value.accountID AS accountID,
          value.memberIDtoAuthorize AS memberIDtoAuthorized
        `,
        {
          memberHandleToBeAuthorized,
          accountID,
          ownerID,
        }
      );
    });

    if (!result.records.length) {
      throw new AccountError("Account or member not found", "NOT_FOUND");
    }

    const record = result.records[0];
    const message = record.get("message");

    if (message === "limitReached") {
      logger.warn("Authorization limit reached", {
        memberHandleToBeAuthorized,
        accountID,
        requestId
      });
      return {
        success: false,
        message: "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another."
      };
    }

    if (message === "accountAuthorized") {
      logger.info("Account authorized successfully", {
        memberIDtoAuthorize: record.get("memberIDtoAuthorized"),
        accountID: record.get("accountID"),
        requestId
      });
      return {
        success: true,
        data: {
          accountID: record.get("accountID"),
          memberIdAuthorized: record.get("memberIDtoAuthorized")
        },
        message: "Account authorized successfully"
      };
    }

    // Should not reach here due to APOC procedure
    throw new AccountError("Unexpected authorization result", "INTERNAL_ERROR");

  } catch (error) {
    if (error instanceof AccountError) {
      throw error;
    }

    logger.error("Unexpected error in AuthorizeForAccountService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });

    throw new AccountError(
      `Failed to authorize account: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AuthorizeForAccountService", {
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });
  }
}
