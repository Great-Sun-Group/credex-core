import { ledgerSpaceDriver } from "../../../config/neo4j";
import * as neo4j from "neo4j-driver";

export async function RequestRecurringService(
  signerMemberID: string,
  requestorAccountID: string,
  counterpartyAccountID: string,
  InitialAmount: number,
  Denomination: string,
  securedCredex: boolean = false,
  credspan: number = 0,
  nextPayDate: string,
  daysBetweenPays: number,
  remainingPays: number
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const createRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (requestor:Account {accountID: $requestorAccountID})<-[:AUTHORIZED_FOR]-
        (signer:Member|Avatar { memberID: $signerMemberID })
      MATCH (counterparty:Account {accountID: $counterpartyAccountID})
      MATCH (daynode:Daynode { Active: true })
      CREATE (recurring:Avatar)
      SET
        recurring.avatarType = "RECURRING",
        recurring.memberID = randomUUID(),
        recurring.Denomination = $Denomination,
        recurring.InitialAmount = $InitialAmount,
        recurring.securedCredex = $securedCredex,
        recurring.credspan = $credspan,
        recurring.nextPayDate = date($nextPayDate),
        recurring.daysBetweenPays = $daysBetweenPays,
        recurring.createdAt = datetime(),
        recurring.remainingPays = $remainingPays,
        recurring.memberTier = 3
      CREATE (requestor)<-[:REQUESTS]-(recurring)<-[:REQUESTS]-(counterparty)
      CREATE (requestor)<-[:REQUESTED]-(recurring)<-[:REQUESTED]-(counterparty)
      CREATE (requestor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (signer)-[:SIGNED]->(recurring)
      CREATE (recurring)-[:CREATED_ON]->(daynode)
      RETURN
        recurring.memberID AS avatarID
      `,
      {
        signerMemberID,
        requestorAccountID,
        counterpartyAccountID,
        InitialAmount,
        Denomination,
        securedCredex,
        credspan: neo4j.int(credspan),
        nextPayDate,
        daysBetweenPays: neo4j.int(daysBetweenPays),
        remainingPays: neo4j.int(remainingPays),
      }
    );

    return createRecurringQuery.records[0].get("avatarID");
  } catch (error) {
    return "Error creating recurring avatar: " + error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
