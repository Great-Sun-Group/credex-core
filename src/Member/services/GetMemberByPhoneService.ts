/*
returns member data

required input:
    phone

returns object with fields for each member property

returns null if member can't be found or phone not passed in
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

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
            RETURN member
        `,
      { phone },
    );

    if (!result.records[0]) {
      console.log("member not found")
      return null;
    }

    return result.records[0].get("member").properties;
  } catch (error) {
    console.error("Error fetching member data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
