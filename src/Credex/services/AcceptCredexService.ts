import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function AcceptCredexService(credexID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        MATCH (issuer:Member)-[rel1:OFFERS|REQUESTS]->(acceptedCredex:Credex{credexID:$credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Member)
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        WITH acceptedCredex
        SET
            acceptedCredex.acceptedAt = Datetime()
        RETURN acceptedCredex.credexID AS credexID
    `,
      { credexID: credexID },
    );
    await ledgerSpaceSession.close();

    if (result.records[0]) {
      console.log(
        "credex offer accepted for: " + result.records[0].get("credexID"),
      );
      return result.records[0].get("credexID");
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
}
