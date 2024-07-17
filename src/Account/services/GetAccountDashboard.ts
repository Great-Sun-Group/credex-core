import { ledgerSpaceDriver } from "../../../config/neo4j";
import { GetBalancesService } from "../../Credex/services/GetBalances";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersIn";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOut";

export async function GetAccountDashboardService(
  uniqueHumanID: string,
  accountID: string,
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH
          (account:Account { accountID: $accountID })\
          <-[:AUTHORIZED_FOR]-
          (human:Human { uniqueHumanID: $uniqueHumanID})
        RETURN
          account.accountID AS accountID,
          account.accountType AS accountType,
          account.accountName AS accountName,
          account.accountHandle AS accountHandle,
          account.defaultDenom AS defaultDenom
      `,
      { uniqueHumanID, accountID }
    );

    if (!result.records.length) {
      console.log("account not found");
      return null;
    }

    const accountData: any = {
      accountID: result.records[0].get("accountID"),
      accountName: result.records[0].get("accountName"),
      accountHandle: result.records[0].get("accountHandle"),
      defaultDenom: result.records[0].get("defaultDenom"),
    };

    accountData.balanceData = await GetBalancesService(accountData.accountID);
    accountData.pendingInData = await GetPendingOffersInService(
      accountData.accountID
    );
    accountData.pendingOutData = await GetPendingOffersOutService(
      accountData.accountID
    );

    return accountData;
  } catch (error) {
    console.error("Error fetching account data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
