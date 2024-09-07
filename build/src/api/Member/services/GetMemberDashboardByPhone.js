"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMemberDashboardByPhoneService = GetMemberDashboardByPhoneService;
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../Core/constants/denominations");
async function GetMemberDashboardByPhoneService(phone) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode { Active: true })
      MATCH (member:Member { phone: $phone })
      OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
      OPTIONAL MATCH (account)-[:OWES|OFFERS]->(credex:Credex)-[:CREATED_ON]->(daynode)
      WITH
        member, daynode,
        COLLECT(account.accountID) AS accountIDs,
        SUM(credex.InitialAmount) AS totalIssuedTodayCXX
      RETURN
        member.memberID AS memberID,
        member.firstname AS firstname,
        member.lastname AS lastname,
        member.memberHandle AS memberHandle,
        member.defaultDenom AS defaultDenom,
        member.memberTier AS memberTier,
        totalIssuedTodayCXX/daynode["USD"] AS totalIssuedTodayUSD,
        accountIDs AS accountIDS
      `, { phone });
        if (!result.records.length) {
            console.log("member not found by phone");
            return false;
        }
        const memberTier = result.records[0].get("memberTier").low;
        const totalIssuedTodayUSD = result.records[0].get("totalIssuedTodayUSD");
        console.log(totalIssuedTodayUSD);
        let remainingAvailableUSD = Infinity;
        if (memberTier == 1) {
            remainingAvailableUSD = parseFloat((0, denominations_1.denomFormatter)(10 - totalIssuedTodayUSD, "USD"));
        }
        if (memberTier == 2) {
            remainingAvailableUSD = parseFloat((0, denominations_1.denomFormatter)(100 - totalIssuedTodayUSD, "USD"));
        }
        return {
            memberID: result.records[0].get("memberID"),
            firstname: result.records[0].get("firstname"),
            lastname: result.records[0].get("lastname"),
            memberHandle: result.records[0].get("memberHandle"),
            defaultDenom: result.records[0].get("defaultDenom"),
            memberTier: memberTier,
            remainingAvailableUSD: remainingAvailableUSD,
            accountIDS: result.records[0].get("accountIDS"),
        };
    }
    catch (error) {
        console.error("Error fetching account data:", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetMemberDashboardByPhone.js.map