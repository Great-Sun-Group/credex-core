/*
returns member data

required input:
    phone

returns object with processed fields for member properties

returns null if member can't be found or phone not passed in
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function GetHumanMemberByPhoneService(
  phone: number
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!phone) {
    console.log("phone is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (member:Member { phone: $phone })
        RETURN
          member.memberID AS memberID,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.handle AS handle      `,
      { phone }
    );

    if (!result.records[0]) {
      console.log("member not found");
      return null;
    }

    return {
      memberID: result.records[0].get("memberID"),
      displayName:
        result.records[0].get("firstname") +
        " " +
        result.records[0].get("lastname"),
      handle: result.records[0].get("handle"),
      defaultAccountID: result.records[0].get("defaultAccountID"),
    };
  } catch (error) {
    console.error("Error fetching member data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
