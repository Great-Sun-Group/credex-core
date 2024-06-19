/*
unauthorizes a human member so they can no longer transact on behalf of a company

required inputs:
    handle for human member to be unauthorized
    memberID for company
    memberID of human company owner as authorizer

on success returns true
    

will return false if:
    member to be unauthorized is not memberType = HUMAN
    company is not memberType = COMPANY
    authorizer is not the human owner of company
    any of the memberIDs are not found

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function UnauthorizeForCompanyService(
  MemberIDtoBeUnauthorized: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (memberToUnauthorize:Member { memberID: $MemberIDtoBeUnauthorized, memberType: "HUMAN" })
                -[authRel:AUTHORIZED_FOR]->(company:Member { memberID: $companyID, memberType: "COMPANY" })
                <-[:OWNS]-(owner:Member { memberID: $ownerID, memberType: "HUMAN" })
            DELETE authRel
            RETURN
                company.memberID AS companyID,
                memberToUnauthorize.memberID AS memberIDtoUnauthorize
        `,
      {
        MemberIDtoBeUnauthorized,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      console.log("could not unauthorize member");
      return false;
    }
    const record = result.records[0];

    console.log(
      `member ${record.get(
        "memberIDtoUnauthorize"
      )} unauthorized to transact for ${record.get("companyID")}`
    );
    return true;
  } catch (error) {
    console.error("Error unauthorizing member:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
