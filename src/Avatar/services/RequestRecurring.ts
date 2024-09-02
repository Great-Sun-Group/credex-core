import { ledgerSpaceDriver } from "../../../config/neo4j";
import * as neo4j from "neo4j-driver";

type RecurringParams = {
  signerMemberID: string;
  requestorAccountID: string;
  counterpartyAccountID: string;
  InitialAmount: number;
  Denomination: string;
  nextPayDate: string;
  daysBetweenPays: neo4j.Integer;
  securedCredex?: boolean;
  credspan?: neo4j.Integer;
  remainingPays?: neo4j.Integer;
};

export async function RequestRecurringService(
  signerMemberID: string,
  requestorAccountID: string,
  counterpartyAccountID: string,
  InitialAmount: number,
  Denomination: string,
  nextPayDate: string,
  daysBetweenPays: number,
  securedCredex?: boolean,
  credspan?: number,
  remainingPays?: number,
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    let cypher = `
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
        recurring.nextPayDate = date($nextPayDate),
        recurring.daysBetweenPays = $daysBetweenPays,
        recurring.createdAt = datetime(),
        recurring.memberTier = 3
    `;

    if (securedCredex !== undefined) {
      cypher += `SET recurring.securedCredex = $securedCredex `;
    }

    if (credspan !== undefined) {
      cypher += `SET recurring.credspan = $credspan `;
    }

    if (remainingPays !== undefined) {
      cypher += `SET recurring.remainingPays = $remainingPays `;
    }

    cypher += `
      CREATE (requestor)<-[:REQUESTS]-(recurring)<-[:REQUESTS]-(counterparty)
      CREATE (requestor)<-[:REQUESTED]-(recurring)<-[:REQUESTED]-(counterparty)
      CREATE (requestor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (signer)-[:SIGNED]->(recurring)
      CREATE (recurring)-[:CREATED_ON]->(daynode)
      RETURN
        recurring.memberID AS avatarID
    `;

    const params: RecurringParams = {
      signerMemberID,
      requestorAccountID,
      counterpartyAccountID,
      InitialAmount,
      Denomination,
      nextPayDate,
      daysBetweenPays: neo4j.int(daysBetweenPays),
    };

    if (securedCredex !== undefined) params.securedCredex = securedCredex;
    if (credspan !== undefined) params.credspan = neo4j.int(credspan);
    if (remainingPays !== undefined) params.remainingPays = neo4j.int(remainingPays);

    const createRecurringQuery = await ledgerSpaceSession.run(cypher, params);

    return createRecurringQuery.records[0].get("avatarID");
  } catch (error) {
    return "Error creating recurring avatar: " + error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
