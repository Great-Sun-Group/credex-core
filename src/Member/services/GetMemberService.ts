/*
returns member data

required input:
    memberID

returns object with fields for each member property

returns null if member can't be found or memberID not passed in

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";
import { GetBalancesService } from "../../Credex/services/GetBalancesService";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersInService";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOutService";

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
        RETURN
          member.memberID AS memberID,
          member.memberType AS memberType,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.companyname AS companyname,
          member.defaultDenom AS defaultDenom,
          member.handle AS handle
      `,
      { memberID }
    );

    if (!result.records[0]) {
      console.log("member not found");
      return null;
    }

    const memberData: any = {
      memberID: result.records[0].get("memberID"),
      displayName: GetDisplayNameService({
        memberType: result.records[0].get("memberType"),
        firstname: result.records[0].get("firstname"),
        lastname: result.records[0].get("lastname"),
        companyname: result.records[0].get("companyname"),
      }),
      defaultDenom: result.records[0].get("defaultDenom"),
      handle: result.records[0].get("handle"),
    };

    const balanceData = await GetBalancesService(memberData.memberID);
    const pendingInData = await GetPendingOffersInService(memberData.memberID);
    const pendingOutData = await GetPendingOffersOutService(
      memberData.memberID
    );

    return {
      memberData: memberData,
      balanceData: balanceData,
      pendingInData: pendingInData,
      pendingOutData: pendingOutData,
    };
  } catch (error) {
    console.error("Error fetching member data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
