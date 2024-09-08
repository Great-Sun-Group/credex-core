import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../../config/logger";

export async function GetMemberDashboardByPhoneService(phone: string) {
  logger.debug("GetMemberDashboardByPhoneService called", { phone });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query", { phone });
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
      logger.info("Member not found by phone", { phone });
      return false;
    }

    const memberTier = result.records[0].get("memberTier").low;
    const totalIssuedTodayUSD = result.records[0].get("totalIssuedTodayUSD");
    logger.debug("Total issued today in USD", { totalIssuedTodayUSD, phone });
    
    let remainingAvailableUSD: number = Infinity;
    if (memberTier == 1) {
      remainingAvailableUSD = parseFloat(
        denomFormatter(10 - totalIssuedTodayUSD, "USD")
      );
    }
    if (memberTier == 2) {
      remainingAvailableUSD = parseFloat(
        denomFormatter(100 - totalIssuedTodayUSD, "USD")
      );
    }

    const memberDashboard = {
      memberID: result.records[0].get("memberID"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      memberHandle: result.records[0].get("memberHandle"),
      defaultDenom: result.records[0].get("defaultDenom"),
      memberTier: memberTier,
      remainingAvailableUSD: remainingAvailableUSD,
      accountIDS: result.records[0].get("accountIDS"),
    };

    logger.info("Member dashboard retrieved successfully", { 
      memberID: memberDashboard.memberID, 
      phone, 
      memberTier, 
      remainingAvailableUSD 
    });

    return memberDashboard;
  } catch (error) {
    logger.error("Error fetching member dashboard", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      phone 
    });
    return false;
  } finally {
    logger.debug("Closing database session", { phone });
    await ledgerSpaceSession.close();
  }
}
