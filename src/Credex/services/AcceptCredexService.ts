/*
marks a credex as accepted by changing the relationships
from OFFERS or REQUESTS to OWES

required inputs:
    credexID

on success returns credexID

will return false if:
    credex does not have OFFERS or REQUESTS relationships (credex already accepted)

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function AcceptCredexService(credexID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (issuer:Member)-[rel1:OFFERS|REQUESTS]->(acceptedCredex:Credex {credexID: $credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Member)
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        SET acceptedCredex.acceptedAt = datetime()
        RETURN acceptedCredex.credexID AS credexID
      `,
      { credexID }
    );

    const acceptedCredexID = result.records[0].get("credexID");
    if (acceptedCredexID) {
      console.log(`Offer accepted for credexID: ${acceptedCredexID}`);
      return acceptedCredexID;
    } else {
      console.log(`Error accepting offer for credexID: ${credexID}`);
      return false;
    }
  } catch (error) {
    console.error("Error accepting credex:", error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
