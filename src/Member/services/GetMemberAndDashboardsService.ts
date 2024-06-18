/*
returns member data

required input:
    memberID

returns object with fields for each member property

returns null if member can't be found or memberID not passed in

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";
import { GetDashboardService } from "./GetDashboardService";

export async function GetMemberAndDashboardsService(
  phone: string
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!phone) {
    console.log("memberID is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (human:Member { phone: $phone })
        OPTIONAL MATCH (human)-[:AUTHORIZED_FOR]->(company:Member)
        WITH human, COLLECT(company.memberID) AS companyMemberIDs
        RETURN
          human.memberID AS memberID,
          human.memberType AS memberType,
          human.firstname AS firstname,
          human.lastname AS lastname,
          human.companyname AS companyname,
          [human.memberID] + companyMemberIDs AS authorizedFor
      `,
      { phone }
    );

    if (!result.records.length) {
      console.log("member not found");
      return null;
    }

    const humanMemberData: any = {
      memberID: result.records[0].get("memberID"),
      displayName: GetDisplayNameService({
        memberType: result.records[0].get("memberType"),
        firstname: result.records[0].get("firstname"),
        lastname: result.records[0].get("lastname"),
        companyname: result.records[0].get("companyname"),
      }),
    };

    const authorizedFor = result.records[0].get("authorizedFor");

    const allDashboardData = await Promise.all(
      authorizedFor.map(async (memberID: string) => {
        const dashboardData = await GetDashboardService(
          humanMemberData.memberID,
          memberID
        );
        return dashboardData;
      })
    );

    return {
      humanMemberData: humanMemberData,
      dashboardData: allDashboardData,
    };
  } catch (error) {
    console.error("Error fetching member data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
