/*
returns account data

required input:
    accountID

returns object with fields for each account property

returns null if account can't be found or accountID not passed in

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";
import { GetDashboardService } from "./GetDashboardService";

export async function GetAccountAndDashboardsService(
  phone: string
): Promise<any | null> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!phone) {
    console.log("accountID is required");
    return null;
  }

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (human:Account { phone: $phone })
        OPTIONAL MATCH (human)-[:AUTHORIZED_FOR]->(company:Account)
        WITH human, COLLECT(company.accountID) AS companyAccountIDs
        RETURN
          human.accountID AS accountID,
          human.accountType AS accountType,
          human.firstname AS firstname,
          human.lastname AS lastname,
          human.companyname AS companyname,
          [human.accountID] + companyAccountIDs AS authorizedFor
      `,
      { phone }
    );

    if (!result.records.length) {
      console.log("account not found");
      return null;
    }

    const humanAccountData: any = {
      accountID: result.records[0].get("accountID"),
      displayName: GetDisplayNameService({
        accountType: result.records[0].get("accountType"),
        firstname: result.records[0].get("firstname"),
        lastname: result.records[0].get("lastname"),
        companyname: result.records[0].get("companyname"),
      }),
    };

    const authorizedFor = result.records[0].get("authorizedFor");

    const allDashboardData = await Promise.all(
      authorizedFor.map(async (accountID: string) => {
        const dashboardData = await GetDashboardService(
          humanAccountData.accountID,
          accountID
        );
        return dashboardData;
      })
    );

    return {
      humanAccountData: humanAccountData,
      dashboardData: allDashboardData,
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
