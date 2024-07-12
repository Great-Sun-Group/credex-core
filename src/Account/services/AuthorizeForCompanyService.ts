/*
authorizes a human account to transact on behalf of a company
maximum 5 accounts (including owner) can be authorized for a company

required inputs:
    handle for human account to be authorized
    accountID for company
    accountID of human company owner as authorizer

on success returns object with fields:
    companyID
    accountIdAuthorized

will return failure message if:
    account to be authorized is not accountType = HUMAN
    company is not accountType = COMPANY
    authorizer is not accountType = HUMAN
    authorizer is not owner of company
    any of the accountIDs are not found

will return as success if account is already authorized to transact for company
but DB will remain unaltered
*/

import { ledgerSpaceDriver } from "../../Admin/config/neo4j";

export async function AuthorizeForCompanyService(
  AccountHandleToBeAuthorized: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (company:Account { accountID: $companyID, accountType: "COMPANY" })
            <-[:OWNS]-(owner:Account { accountID: $ownerID, accountType: "HUMAN" })
        MATCH (accountToAuthorize:Account { handle: $AccountHandleToBeAuthorized, accountType: "HUMAN" })
        MATCH (:Account)-[currentAuthForRel:AUTHORIZED_FOR]->(company)
        WITH count (currentAuthForRel) AS numAuthorized, accountToAuthorize, company
        CALL apoc.do.when(
          numAuthorized >= 5,
          'RETURN "limitReached" AS message',
          'MERGE (accountToAuthorize)-[:AUTHORIZED_FOR]->(company)
            RETURN
              "accountAuthorized" AS message,
              company.accountID AS companyID,
              accountToAuthorize.accountID AS accountIDtoAuthorize',
          {
            numAuthorized: numAuthorized,
            accountToAuthorize: accountToAuthorize,
            company: company
          }
        )
        YIELD value
        RETURN
          value.message AS message,
          value.companyID AS companyID,
          value.accountIDtoAuthorize AS accountIDtoAuthorize
      `,
      {
        AccountHandleToBeAuthorized,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      return {
        message: "accounts or company not found",
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
          "accountIDtoAuthorize"
        )} authorized to transact for ${record.get("companyID")}`
      );
      return {
        message: "account authorized",
        companyID: record.get("companyID"),
        accountIdAuthorized: record.get("accountIDtoAuthorize"),
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
