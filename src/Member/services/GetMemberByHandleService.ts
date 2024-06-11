/*
returns member display name as string

required input:
    handle

returns null if member can't be found or handle not passed in
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";

export async function GetMemberByHandleService(
  handle: string
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!handle) {
    console.log("handle is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { handle: $handle })
            RETURN
              member.memberID AS memberID,
              member.memberType AS memberType,
              member.firstname AS firstname,
              member.lastname AS lastname,
              member.companyname AS companyname
        `,
      { handle }
    );

    if (!result.records[0]) {
      console.log("member not found");
      return null;
    }

    const displayName = GetDisplayNameService({
      memberID: result.records[0].get("memberID"),
      memberType: result.records[0].get("memberType"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      companyname: result.records[0].get("companyname"),
    });

    return displayName;
  } catch (error) {
    console.error("Error fetching member data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
