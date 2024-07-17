import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function AuthorizeForAccountService(
  humanHandleToBeAuthorized: string,
  accountID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (account:Account { accountID: $accountID })
            <-[:OWNS]-(owner:Human { uniqueHumanID: $ownerID })
        MATCH (humanToAuthorize:Human { handle: $humanHandleToBeAuthorized })
        MATCH (:Human)-[currentAuthForRel:AUTHORIZED_FOR]->(account)
        WITH count (currentAuthForRel) AS numAuthorized, humanToAuthorize, account
        CALL apoc.do.when(
          numAuthorized >= 5,
          'RETURN "limitReached" AS message',
          'MERGE (humanToAuthorize)-[:AUTHORIZED_FOR]->(account)
            RETURN
              "accountAuthorized" AS message,
              account.accountID AS accountID,
              humanToAuthorize.accountID AS humanIDtoAuthorize',
          {
            numAuthorized: numAuthorized,
            humanToAuthorize: humanToAuthorize,
            account: account
          }
        )
        YIELD value
        RETURN
          value.message AS message,
          value.accountID AS accountID,
          value.humanIDtoAuthorize AS humanIDtoAuthorize
      `,
      {
        humanHandleToBeAuthorized,
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
          "humanIDtoAuthorize"
        )} authorized to transact for ${record.get("accountID")}`
      );
      return {
        message: "account authorized",
        accountID: record.get("accountID"),
        humanIdAuthorized: record.get("humanIDtoAuthorize"),
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
