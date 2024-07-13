import { ledgerSpaceDriver } from "../../../config/neo4j";
import { GetDisplayNameService } from "./GetDisplayNameService";
import { GetBalancesService } from "../../Credex/services/GetBalances";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersIn";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOut";

export async function GetAccountDashboardService(
  accountID: string,
  authorizedForID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (account:Account {accountID: $authorizedForID})
        OPTIONAL MATCH (account)<-[:OWNS]-(owner:Account { accountID: $accountID})
        OPTIONAL MATCH (humanAccount:Account { accountID: $accountID})
        OPTIONAL MATCH (account)-[:SEND_OFFERS_TO]->(offerRecipient:Account)
        OPTIONAL MATCH (account)<-[:AUTHORIZED_FOR]-(authFor:Account)
        WITH account, owner, humanAccount, offerRecipient, collect(authFor) AS authForList
        CALL apoc.do.when(
          size(authForList) > 0,
          'RETURN [auth IN $authForList | { accountID: auth.accountID, displayName: auth.firstname + " " + auth.lastname }] AS authorizedAccounts',
          'RETURN [] AS authorizedAccounts',
          { authForList: authForList }
        ) YIELD value
        WITH
          CASE
              WHEN account = humanAccount THEN "human"
              WHEN owner IS NOT NULL THEN "owned"
              ELSE "authorizedFor"
          END AS dashboardType,
          CASE
              WHEN account = humanAccount THEN account
              WHEN offerRecipient IS NOT NULL THEN offerRecipient
              ELSE null
          END AS offerRecipient,
          account, value
        RETURN
          dashboardType,
          account.accountID AS accountID,
          account.accountType AS accountType,
          account.firstname AS firstname,
          account.lastname AS lastname,
          account.companyname AS companyname,
          account.handle AS handle,
          account.defaultDenom AS defaultDenom,
          offerRecipient.accountID AS offerRecipientID,
          offerRecipient.firstname + " " + offerRecipient.lastname AS offerRecipientDisplayname,
          value.authorizedAccounts AS authorizedAccounts
      `,
      { accountID, authorizedForID }
    );

    if (!result.records.length) {
      console.log("account not found");
      return null;
    }

    const accountData: any = {
      dashboardType: result.records[0].get("dashboardType"),
      accountID: result.records[0].get("accountID"),
      displayName: GetDisplayNameService({
        accountType: result.records[0].get("accountType"),
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
      authorizedAccounts: result.records[0].get("authorizedAccounts"),
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
