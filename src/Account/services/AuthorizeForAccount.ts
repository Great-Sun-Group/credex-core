import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function AuthorizeForAccountService(
  memberHandleToBeAuthorized: string,
  accountID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  //check that account authorization is permitted on membership tier
  const getMemberTier = await ledgerSpaceSession.run(
    `
        MATCH (member:Member{ memberID: $ownerID })
        RETURN member.memberTier as memberTier
      `,
    { ownerID }
  );

  const memberTier = getMemberTier.records[0].get("memberTier");
  if (memberTier <= 3) {
    return {
      message:
        "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.",
    };
  }

  try {
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
      return {
        message: "accounts not found",
      };
    }

    const record = result.records[0];

    if (record.get("message") == "limitReached") {
      return {
        message:
          "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another.",
      };
    }

    if (record.get("message") == "accountAuthorized") {
      console.log(
        `account ${record.get(
          "memberIDtoAuthorize"
        )} authorized to transact for ${record.get("accountID")}`
      );
      return {
        message: "account authorized",
        accountID: record.get("accountID"),
        memberIdAuthorized: record.get("memberIDtoAuthorize"),
      };
    } else {
      console.log("could not authorize account");
      return false;
    }
  } catch (error) {
    console.error("Error authorizing account:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
