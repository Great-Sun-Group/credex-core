/*
returns member data

required input:
    phone

returns object with fields for each member property

returns null if member can't be found or phone not passed in
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";

export async function GetMemberByPhoneService(
  phone: number,
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!phone) {
    console.log("phone is required")
    return null
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { phone: $phone })
            RETURN
              member.memberID AS memberID,
              member.memberType AS memberType,
              member.firstname AS firstname,
              member.lastname AS lastname,
              member.companyname AS companyname,
              member.defaultDenom AS defaultDenom,
              member.handle AS handle
        `,
      { phone }
    );

    if (!result.records[0]) {
      console.log("member not found")
      return null;
    }

    const memberID = result.records[0].get("memberID");
    const displayName = GetDisplayNameService({
      memberID: memberID,
      memberType: result.records[0].get("memberType"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      companyname: result.records[0].get("companyname"),
    });

    return {
      memberID: memberID,
      displayName: displayName,
      defaultDenom: result.records[0].get("defaultDenom"),
      handle: result.records[0].get("handle"),
    };
  } catch (error) {
    console.error("Error fetching member data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
