/*
authorizes a human member to transact on behalf of a company by
adding an AUTHORIZED_FOR relationship

required inputs:
    handle for human member to be authorized
    memberID for company
    memberID of human company owner as authorizer

on success returns object with fields:
    companyID
    companyname
    memberIdAuthorized
    memberNameAuthorized
    authorizerID
    authorizerName

will return false if:
    member to be authorized is not memberType = HUMAN
    company is not memberType = COMPANY
    authorizer is not memberType = HUMAN
    authorizer is not owner of company
    any of the memberIDs are not found

will return as success if member is already authorized to transact for company
but DB will remain unaltered
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function AuthorizeForCompanyService(
  MemberHandleToBeAuthorized: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (company:Member { memberID: $companyID, memberType: "COMPANY" })
                <-[:OWNS]-(owner:Member { memberID: $ownerID, memberType: "HUMAN" })
            MATCH (memberToAuthorize:Member { handle: $MemberHandleToBeAuthorized, memberType: "HUMAN" })
            MERGE (memberToAuthorize)-[:AUTHORIZED_FOR]->(company)
            RETURN
                company.memberID AS companyID,
                memberToAuthorize.memberID AS memberIDtoAuthorize
        `,
      {
        MemberHandleToBeAuthorized,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      console.log("members or company not found");
      return null;
    }

    const record = result.records[0];

    if (record.get("memberIDtoAuthorize")) {
      console.log(
        `member ${record.get(
          "memberIDtoAuthorize"
        )} authorized to transact for ${record.get("companyID")}`
      );
      return {
        companyID: record.get("companyID"),
        memberIDtoAuthorize: record.get("memberIDtoAuthorize"),
      };
    } else {
      console.log("could not authorize member");
      return false;
    }
  } catch (error) {
    console.error("Error authorizing member:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
