/*
marks a credex as accepted by changing the relationships
from OFFERS or REQUESTS to OWES

required inputs:
  credexID

on success returns credexID

will return false if:
  credexID not found
  credex does not have OFFERS or REQUESTS relationships (credex already accepted/declined/cancelled)

*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function AcceptCredexService(credexID: string) {
  if (!credexID) {
    console.log("credexID required");
    return false;
  }
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

    if (result.records.length === 0) {
      console.log(
        `No records found or credex no longer pending for credexID: ${credexID}`
      );
      return false;
    }

    const acceptedCredexID = result.records[0].get("credexID");
    console.log(`Offer accepted for credexID: ${acceptedCredexID}`);
    return acceptedCredexID;
  } catch (error) {
    console.error(`Error accepting credex for credexID ${credexID}:`, error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
