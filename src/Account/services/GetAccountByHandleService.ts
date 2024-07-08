/*
returns
  accountID
  account display name

required input:
    handle

returns null if account can't be found or handle not passed in
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";

export async function GetAccountByHandleService(
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
            MATCH (account:Account { handle: $handle })
            RETURN
              account.accountID AS accountID,
              account.accountType AS accountType,
              account.firstname AS firstname,
              account.lastname AS lastname,
              account.companyname AS companyname
        `,
      { handle }
    );

    if (!result.records[0]) {
      console.log("account not found");
      return null;
    }

    const accountID = result.records[0].get("accountID");
    const displayName = GetDisplayNameService({
      accountType: result.records[0].get("accountType"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      companyname: result.records[0].get("companyname"),
    });

    return {
      accountID: accountID,
      displayName: displayName,
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
