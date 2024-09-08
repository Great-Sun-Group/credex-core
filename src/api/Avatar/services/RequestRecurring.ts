import { ledgerSpaceDriver } from "../../../../config/neo4j";
import * as neo4j from "neo4j-driver";
import { digitallySign } from "../../../utils/digitalSignature";

interface RecurringParams {
  signerMemberID: string;
  requestorAccountID: string;
  counterpartyAccountID: string;
  InitialAmount: number;
  Denomination: string;
  nextPayDate: string;
  daysBetweenPays: number;
  securedCredex?: boolean;
  credspan?: number;
  remainingPays?: number;
}

export async function RequestRecurringService(
  params: RecurringParams
): Promise<string | null> {
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

    if (params.securedCredex !== undefined) {
      cypher += `SET recurring.securedCredex = $securedCredex `;
    }

    if (params.credspan !== undefined) {
      cypher += `SET recurring.credspan = $credspan `;
    }

    if (params.remainingPays !== undefined) {
      cypher += `SET recurring.remainingPays = $remainingPays `;
    }

    cypher += `
      CREATE (requestor)<-[:REQUESTS]-(recurring)<-[:REQUESTS]-(counterparty)
      CREATE (requestor)<-[:REQUESTED]-(recurring)<-[:REQUESTED]-(counterparty)
      CREATE (requestor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (recurring)-[:CREATED_ON]--(daynode)
      RETURN
        recurring.memberID AS avatarID
    `;

    const neo4jParams = {
      ...params,
      daysBetweenPays: neo4j.int(params.daysBetweenPays),
      credspan: params.credspan ? neo4j.int(params.credspan) : undefined,
      remainingPays: params.remainingPays
        ? neo4j.int(params.remainingPays)
        : undefined,
    };

    const createRecurringQuery = await ledgerSpaceSession.run(
      cypher,
      neo4jParams
    );
    const avatarID = createRecurringQuery.records[0]?.get("avatarID");

    if (avatarID) {
      // Create digital signature
      await digitallySign(
        ledgerSpaceSession,
        params.signerMemberID,
        "Avatar",
        avatarID
      );
    }

    return avatarID || null;
  } catch (error) {
    console.error("Error creating recurring avatar:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
