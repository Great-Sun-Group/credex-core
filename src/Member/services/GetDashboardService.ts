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
        OPTIONAL MATCH (member)-[:SEND_OFFERS_TO]->(offerRecipient:Member)
        OPTIONAL MATCH (member)<-[:AUTHORIZED_FOR]-(authFor:Member)
        WITH member, owner, humanMember, offerRecipient, collect(authFor) AS authForList
        CALL apoc.do.when(
          size(authForList) > 0,
          'RETURN [auth IN $authForList | { memberID: auth.memberID, displayName: auth.firstname + " " + auth.lastname }] AS authorizedMembers',
          'RETURN [] AS authorizedMembers',
          { authForList: authForList }
        ) YIELD value
        WITH
          CASE
              WHEN member = humanMember THEN "human"
              WHEN owner IS NOT NULL THEN "owned"
              ELSE "authorizedFor"
          END AS dashboardType,
          CASE
              WHEN member = humanMember THEN member
              WHEN offerRecipient IS NOT NULL THEN offerRecipient
              ELSE null
          END AS offerRecipient,
          member, value
        RETURN
          dashboardType,
          member.memberID AS memberID,
          member.memberType AS memberType,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.companyname AS companyname,
          member.handle AS handle,
          member.defaultDenom AS defaultDenom,
          offerRecipient.memberID AS offerRecipientID,
          offerRecipient.firstname + " " + offerRecipient.lastname AS offerRecipientDisplayname,
          value.authorizedMembers AS authorizedMembers
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
      offerRecipientID: result.records[0].get("offerRecipientID"),
      offerRecipientDisplayname: result.records[0].get(
        "offerRecipientDisplayname"
      ),
      authorizedMembers: result.records[0].get("authorizedMembers"),
    };

    accountData.balanceData = await GetBalancesService(accountData.memberID);
    accountData.pendingInData = await GetPendingOffersInService(
      accountData.memberID
    );
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
