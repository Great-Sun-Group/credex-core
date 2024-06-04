/*
to find companies that a human member is authorized to transact for

required inputs:
    memberID

returns object with these fields for each company:
    memberID
    companyname
    handle

returns empty object if
    member has no companies authorized
    memberID submitted is not memberType HUMAN
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { Member } from "../types/Member";

export async function GetAuthorizedForCompaniesService(
  memberID: string,
): Promise<Member[]> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            OPTIONAL MATCH
                (member:Member { memberID: $memberID, memberType: "HUMAN" })
                -[:AUTHORIZED_TO_TRANSACT_FOR]->(company:Member { memberType: "COMPANY" })
            RETURN
                company.memberID AS memberID,
                company.companyname AS companyname,
                company.handle AS handle
        `,
      { memberID },
    );

    if (!result.records[0].get("memberID")) {
      console.log("no authorized companies:");
      return [];
    }

    const companiesAuthorizedFor: Member[] = result.records.map((record) => ({
      memberID: record.get("memberID"),
      companyname: record.get("companyname"),
      handle: record.get("handle"),
    }));

    return companiesAuthorizedFor;
  } catch (error) {
    console.error("Error fetching authorized companies:", error);
    return [];
  } finally {
    await ledgerSpaceSession.close();
  }
}
