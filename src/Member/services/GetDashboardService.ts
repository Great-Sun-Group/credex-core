import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";
import { GetBalancesService } from "../../Credex/services/GetBalancesService";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersInService";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOutService";

export async function GetDashboardService(
  memberID: string,
  authorizedForID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (member:Member {memberID: $authorizedForID})
        OPTIONAL MATCH (member)<-[:OWNS]-(owner:Member { memberID: $memberID})
        OPTIONAL MATCH (humanMember:Member { memberID: $memberID})
        WITH CASE
            WHEN member = humanMember THEN "human"
            WHEN owner IS NOT NULL THEN "owned"
            ELSE "authorizedFor"
        END AS dashboardType,
        member
        RETURN
          dashboardType,
          member.memberID AS memberID,
          member.memberType AS memberType,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.companyname AS companyname,
          member.handle AS handle,
          member.defaultDenom AS defaultDenom
      `,
      { memberID, authorizedForID }
    );

    if (!result.records.length) {
      console.log("member not found");
      return null;
    }

    const accountData: any = {
      dashboardType: result.records[0].get("dashboardType"),
      memberID: result.records[0].get("memberID"),
      displayName: GetDisplayNameService({
        memberType: result.records[0].get("memberType"),
        firstname: result.records[0].get("firstname"),
        lastname: result.records[0].get("lastname"),
        companyname: result.records[0].get("companyname"),
      }),
      handle: result.records[0].get("handle"),
      defaultDenom: result.records[0].get("defaultDenom"),
    };

    accountData.balanceData = await GetBalancesService(accountData.memberID);
    accountData.pendingInData = await GetPendingOffersInService(accountData.memberID);
    accountData.pendingOutData = await GetPendingOffersOutService(
      accountData.memberID
    );

    return accountData;
  } catch (error) {
    console.error("Error fetching member data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
