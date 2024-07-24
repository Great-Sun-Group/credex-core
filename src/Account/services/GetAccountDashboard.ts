import { ledgerSpaceDriver } from "../../../config/neo4j";
import { GetBalancesService } from "../../Credex/services/GetBalances";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersIn";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOut";

export async function GetAccountDashboardService(
  memberID: string,
  accountID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    interface AuthMember {
      memberID: string;
      firstname: string;
      lastname: string;
    }

    interface AccountData {
      accountID: string;
      accountName: string;
      accountHandle: string;
      defaultDenom: string;
      isOwnedAccount: boolean;
      sendOffersToFirstname: string;
      sendOffersToLastname: string;
      sendOffersToMemberID: string;
      authFor: AuthMember[];
      balanceData: any;
      pendingInData: any;
      pendingOutData: any;
    }

    const result = await ledgerSpaceSession.run(
      `
    MATCH
      (account:Account { accountID: $accountID })
      <-[:AUTHORIZED_FOR]-
      (member:Member { memberID: $memberID})
    MATCH
      (account)<-[:AUTHORIZED_FOR]-(allAuthMembers)
    OPTIONAL MATCH
      (account)<-[owns:OWNS]-(member)
    OPTIONAL MATCH
      (account)-[:SEND_OFFERS_TO]->(sendOffersTo:Member)
    RETURN
      account.accountID AS accountID,
      account.accountType AS accountType,
      account.accountName AS accountName,
      account.accountHandle AS accountHandle,
      account.defaultDenom AS defaultDenom,
      sendOffersTo.firstname AS sendOffersToFirstname,
      sendOffersTo.lastname AS sendOffersToLastname,
      sendOffersTo.memberID AS sendOffersToMemberID,
      owns IS NOT NULL AS isOwnedAccount,
      allAuthMembers.firstname AS authMemberFirstname,
      allAuthMembers.lastname AS authMemberLastname,
      allAuthMembers.memberID AS authMemberID
  `,
      { memberID, accountID }
    );

    if (!result.records.length) {
      console.log("account not found");
      return null;
    }

    const accountData: AccountData = {
      accountID: result.records[0].get("accountID"),
      accountName: result.records[0].get("accountName"),
      accountHandle: result.records[0].get("accountHandle"),
      defaultDenom: result.records[0].get("defaultDenom"),
      isOwnedAccount: result.records[0].get("isOwnedAccount"),
      sendOffersToFirstname: "",
      sendOffersToLastname: "",
      sendOffersToMemberID: "",
      authFor: [],
      balanceData: [],
      pendingInData: [],
      pendingOutData: [],
    };

    if (accountData.isOwnedAccount) {
      (accountData.sendOffersToFirstname = result.records[0].get(
        "sendOffersToFirstname"
      )),
        (accountData.sendOffersToLastname = result.records[0].get(
          "sendOffersToLastname"
        )),
        (accountData.sendOffersToMemberID = result.records[0].get(
          "sendOffersToMemberID"
        )),
        result.records.forEach((record) => {
          accountData.authFor.push({
            memberID: record.get("authMemberID"),
            firstname: record.get("authMemberFirstname"),
            lastname: record.get("authMemberLastname"),
          });
        });
    } else {
      accountData.authFor = [];
    }
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
