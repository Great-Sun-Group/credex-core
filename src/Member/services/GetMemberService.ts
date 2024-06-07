/*
returns member data

required input:
    memberID

returns object with fields for each member property

returns null if member can't be found or memberID not passed in

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function GetMemberService(memberID: string): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!memberID) {
    console.log("memberID is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { memberID: $memberID })
            RETURN member
        `,
      { memberID },
    );

    if (!result.records[0].length) {
      return null;
    }

    return result.records[0].get("member").properties;
  } catch (error) {
    console.error("Error fetching member data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
