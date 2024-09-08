import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../../config/logger";

export async function AuthorizeForAccountService(
  memberHandleToBeAuthorized: string,
  accountID: string,
  ownerID: string
) {
  logger.debug("AuthorizeForAccountService called", { memberHandleToBeAuthorized, accountID, ownerID });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check that account authorization is permitted on membership tier
    logger.debug("Checking membership tier for authorization permission");
    const getMemberTier = await ledgerSpaceSession.run(
      `
        MATCH (member:Member{ memberID: $ownerID })
        RETURN member.memberTier as memberTier
      `,
      { ownerID }
    );

    const memberTier = getMemberTier.records[0].get("memberTier");
    if (memberTier <= 3) {
      logger.warn("Insufficient membership tier for authorization", { ownerID, memberTier });
      return {
        message:
          "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.",
      };
    }

    logger.debug("Executing database query for account authorization");
    const result = await ledgerSpaceSession.run(
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
          value.memberIDtoAuthorize AS memberIDtoAuthorize
      `,
      {
        memberHandleToBeAuthorized,
        accountID,
        ownerID,
      }
    );

    if (!result.records.length) {
      logger.warn("Accounts not found during authorization", { memberHandleToBeAuthorized, accountID, ownerID });
      return {
        message: "accounts not found",
      };
    }

    const record = result.records[0];

    if (record.get("message") == "limitReached") {
      logger.warn("Authorization limit reached", { memberHandleToBeAuthorized, accountID, ownerID });
      return {
        message:
          "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another.",
      };
    }

    if (record.get("message") == "accountAuthorized") {
      logger.info("Account authorized successfully", {
        memberIDtoAuthorize: record.get("memberIDtoAuthorize"),
        accountID: record.get("accountID")
      });
      return {
        message: "account authorized",
        accountID: record.get("accountID"),
        memberIdAuthorized: record.get("memberIDtoAuthorized"),
      };
    } else {
      logger.warn("Could not authorize account", { memberHandleToBeAuthorized, accountID, ownerID });
      return false;
    }
  } catch (error) {
    logger.error("Error authorizing account", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberHandleToBeAuthorized, 
      accountID, 
      ownerID 
    });
    throw error;
  } finally {
    logger.debug("Closing database session", { memberHandleToBeAuthorized, accountID, ownerID });
    await ledgerSpaceSession.close();
  }
}
