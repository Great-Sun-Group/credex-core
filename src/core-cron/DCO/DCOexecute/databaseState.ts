import { logInfo, logDebug } from "../../../utils/logger";

/**
 * Waits for MTQ completion before proceeding with DCO
 */
export async function waitForMTQCompletion(session: any): Promise<void> {
  logInfo("Waiting for MTQ completion");
  let MTQflag = true;
  while (MTQflag) {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.MTQrunningNow AS MTQflag
    `);
    MTQflag = result.records[0]?.get("MTQflag");
    if (MTQflag) {
      logDebug("MTQ running. Waiting 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  logInfo("MTQ not running. Proceeding...");
}

/**
 * Sets the DCO running flag and returns date information
 */
export async function setDCORunningFlag(
  session: any
): Promise<{ previousDate: string; nextDate: string }> {
  logInfo("Setting DCOrunningNow flag");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = true
    RETURN
      daynode.Date AS previousDate,
      daynode.Date + Duration({days: 1}) AS nextDate
  `);
  const previousDate = result.records[0].get("previousDate");
  const nextDate = result.records[0].get("nextDate");
  logInfo(`Expiring day: ${previousDate}`);
  return { previousDate, nextDate };
}

/**
 * Resets the DCO running flag
 */
export async function resetDCORunningFlag(session: any): Promise<void> {
  logInfo("Resetting DCOrunningNow flag");
  await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = false
  `);
}

/**
 * Handles defaulting credexes in the system
 */
export async function handleDefaultingCredexes(session: any): Promise<void> {
  logInfo("Processing defaulting unsecured credexes");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    OPTIONAL MATCH (account1:Account)-[rel1:OWES]->(defaulting:Credex)-[rel2:OWES]->(account2:Account)
    WHERE defaulting.dueDate <= daynode.Date AND defaulting.DefaultedAmount <= 0
    SET defaulting.DefaultedAmount = defaulting.OutstandingAmount
    WITH defaulting, daynode
    UNWIND defaulting AS defaultingCredex
    CREATE (defaultingCredex)-[:DEFAULTED_ON]->(daynode)
    RETURN count(defaulting) AS numberDefaulted
  `);
  const numberDefaulted = result.records[0]?.get("numberDefaulted") || 0;
  logInfo(`Defaults: ${numberDefaulted}`);
}

/**
 * Expires pending offers in the system
 */
export async function expirePendingOffers(session: any): Promise<void> {
  logInfo("Expiring pending offers/requests");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    OPTIONAL MATCH (:Account)-[rel1:OFFERS|REQUESTS]->(expiringPending:Credex)-[rel2:OFFERS|REQUESTS]->(:Account),
    (expiringPending)-[:CREATED_ON]->(createdDaynode:Daynode)
    WHERE createdDaynode.Date + Duration({days: 1}) < daynode.Date
    DELETE rel1, rel2
    RETURN count(expiringPending) AS numberExpiringPending
  `);
  const numberExpiringPending =
    result.records[0]?.get("numberExpiringPending") || 0;
  logInfo(`Expired pending offers/requests: ${numberExpiringPending}`);
}

/**
 * Creates a new daynode with updated rates
 */
export async function createNewDaynode(
  session: any,
  newCXXrates: any,
  nextDate: string,
  CXXprior_CXXcurrent: number
): Promise<void> {
  logInfo("Creating new daynode");
  await session.run(
    `
    MATCH (expiringDaynode:Daynode {Active: TRUE})
    CREATE (expiringDaynode)-[:NEXT_DAY]->(nextDaynode:Daynode)
    SET expiringDaynode.Active = false,
        expiringDaynode.DCOrunningNow = false,
        nextDaynode = $newCXXrates,
        nextDaynode.CXXprior_CXXcurrent = $CXXprior_CXXcurrent,
        nextDaynode.Date = date($nextDate),
        nextDaynode.Active = true,
        nextDaynode.DCOrunningNow = true
  `,
    { newCXXrates, nextDate, CXXprior_CXXcurrent }
  );
}

/**
 * Retrieves foundation account data
 */
export async function getFoundationData(
  session: any
): Promise<{ foundationID: string; foundationXOid: string }> {
  const result = await session.run(`
    MATCH (credexFoundation:Account {accountType: "CREDEX_FOUNDATION"})<-[:OWNS]-(foundationXO:Member)
    RETURN credexFoundation.accountID AS foundationID, foundationXO.memberID AS foundationXOid
  `);
  return {
    foundationID: result.records[0].get("foundationID"),
    foundationXOid: result.records[0].get("foundationXOid"),
  };
}
