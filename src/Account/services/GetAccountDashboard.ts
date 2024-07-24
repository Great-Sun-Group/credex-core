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
    RETURN
      account.accountID AS accountID,
      account.accountType AS accountType,
      account.accountName AS accountName,
      account.accountHandle AS accountHandle,
      account.defaultDenom AS defaultDenom,
      owns IS NOT NULL AS isOwnedAccount,
      allAuthMembers.firstname AS authMemberFirst,
      allAuthMembers.lastname AS authMemberLast,
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
  authFor: [],
  balanceData: [],
  pendingInData: [],
  pendingOutData: [],
};

result.records.forEach((record) => {
  accountData.authFor.push({
    memberID: record.get("authMemberID"),
    firstname: record.get("authMemberFirst"),
    lastname: record.get("authMemberLast"),
  });
});

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
