/*
authorizes a human member to transact on behalf of a company
maximum 5 members (including owner) can be authorized for a company

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
        MATCH (:Member)-[currentAuthForRel:AUTHORIZED_FOR]->(company)
        WITH count (currentAuthForRel) AS numAuthorized, memberToAuthorize, company
        CALL apoc.do.when(
          numAuthorized >= 5,
          'RETURN "limitReached" AS message',
          'MERGE (memberToAuthorize)-[:AUTHORIZED_FOR]->(company)
            RETURN
              "memberAuthorized" AS message,
              company.memberID AS companyID,
              memberToAuthorize.memberID AS memberIDtoAuthorize',
          {
            numAuthorized: numAuthorized,
            memberToAuthorize: memberToAuthorize,
            company: company
          }
        )
        YIELD value
        RETURN
          value.message AS message,
          value.companyID AS companyID,
          value.memberIDtoAuthorize AS memberIDtoAuthorize
      `,
      {
        MemberHandleToBeAuthorized,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      return "members or company not found";
    }

    const record = result.records[0];

    if (record.get("message") == "limitReached") {
      return {
        message:
          "Limit of 5 authorized members reached. Remove an authorized member if you want to add another.",
      };
    }

    if (record.get("message") == "memberAuthorized") {
      console.log(
        `member ${record.get(
          "memberIDtoAuthorize"
        )} authorized to transact for ${record.get("companyID")}`
      );
      return {
        message: "member authorized",
        companyID: record.get("companyID"),
        memberIdAuthorized: record.get("memberIDtoAuthorize"),
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
