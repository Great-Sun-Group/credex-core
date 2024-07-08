/*
unauthorizes a human account so they can no longer transact on behalf of a company

required inputs:
    handle for human account to be unauthorized
    accountID for company
    accountID of human company owner as authorizer

on success returns true
    

will return false if:
    account to be unauthorized is not accountType = HUMAN
    company is not accountType = COMPANY
    authorizer is not the human owner of company
    any of the accountIDs are not found

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function UnauthorizeForCompanyService(
  AccountIDtoBeUnauthorized: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (accountToUnauthorize:Account { accountID: $AccountIDtoBeUnauthorized, accountType: "HUMAN" })
                -[authRel:AUTHORIZED_FOR]->(company:Account { accountID: $companyID, accountType: "COMPANY" })
                <-[:OWNS]-(owner:Account { accountID: $ownerID, accountType: "HUMAN" })
            DELETE authRel
            RETURN
                company.accountID AS companyID,
                accountToUnauthorize.accountID AS accountIDtoUnauthorize
        `,
      {
        AccountIDtoBeUnauthorized,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      console.log("could not unauthorize account");
      return false;
    }
    const record = result.records[0];

    console.log(
      `account ${record.get(
        "accountIDtoUnauthorize"
      )} unauthorized to transact for ${record.get("companyID")}`
    );
    return true;
  } catch (error) {
    console.error("Error unauthorizing account:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
