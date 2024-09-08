"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAccountDashboardService = GetAccountDashboardService;
const neo4j_1 = require("../../../../config/neo4j");
const GetBalances_1 = require("./GetBalances");
const GetPendingOffersIn_1 = require("../../Credex/services/GetPendingOffersIn");
const GetPendingOffersOut_1 = require("../../Credex/services/GetPendingOffersOut");
async function GetAccountDashboardService(memberID, accountID) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
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
  `, { memberID, accountID });
        if (!result.records.length) {
            console.log("account not found");
            return null;
        }
        const accountData = {
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
            (accountData.sendOffersToFirstname = result.records[0].get("sendOffersToFirstname")),
                (accountData.sendOffersToLastname = result.records[0].get("sendOffersToLastname")),
                (accountData.sendOffersToMemberID = result.records[0].get("sendOffersToMemberID")),
                result.records.forEach((record) => {
                    accountData.authFor.push({
                        memberID: record.get("authMemberID"),
                        firstname: record.get("authMemberFirstname"),
                        lastname: record.get("authMemberLastname"),
                    });
                });
        }
        else {
            accountData.authFor = [];
        }
        accountData.balanceData = await (0, GetBalances_1.GetBalancesService)(accountData.accountID);
        accountData.pendingInData = await (0, GetPendingOffersIn_1.GetPendingOffersInService)(accountData.accountID);
        accountData.pendingOutData = await (0, GetPendingOffersOut_1.GetPendingOffersOutService)(accountData.accountID);
        return accountData;
    }
    catch (error) {
        console.error("Error fetching account data:", error);
        return null;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetAccountDashboard.js.map