import { ledgerSpaceDriver } from "../../../config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";

export async function GetMemberDashboardByPhoneService(phone: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
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
      `,
      { phone }
    );

    if (!result.records.length) {
      console.log("member not found by phone");
      return false;
    }

    const memberTier = result.records[0].get("memberTier").low;
    const totalIssuedTodayUSD = result.records[0].get("totalIssuedTodayUSD");
    console.log(totalIssuedTodayUSD);
    let remainingAvailable: string | number = Infinity;
    if (memberTier == 1) {
      remainingAvailable =
        denomFormatter(10 - totalIssuedTodayUSD, "USD") + " USD";
    }
    if (memberTier == 2) {
      remainingAvailable =
        denomFormatter(100 - totalIssuedTodayUSD, "USD") + " USD";
    }

    return {
      memberID: result.records[0].get("memberID"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      memberHandle: result.records[0].get("memberHandle"),
      defaultDenom: result.records[0].get("defaultDenom"),
      memberTier: memberTier,
      remainingAvailable: remainingAvailable,
      accountIDS: result.records[0].get("accountIDS"),
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
