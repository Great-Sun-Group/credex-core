/*
marks a credex as cancelled by changing the relationships
from OFFERS or REQUESTS to CANCELLED

required inputs:
  credexID

on success returns credexID

will return false if:
  credexID not found
  credex does not have OFFERS or REQUESTS relationships (credex already accepted/declined/cancelled)
    
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function CancelCredexService(credexID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (issuer:Member)-[rel1:OFFERS|REQUESTS]->(credex:Credex {credexID: $credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Member)
        DELETE rel1, rel2
        CREATE (issuer)-[:CANCELLED]->(credex)-[:CANCELLED]->(acceptor)
        SET
          credex.cancelledAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN credex.credexID AS credexID
      `,
      { credexID }
    );

    if (result.records.length === 0) {
      console.log(
        `No records found or credex no longer pending for credexID: ${credexID}`
      );
      return false;
    }

    const cancelledCredexID = result.records[0].get("credexID");
    console.log(`Offer declined for credexID: ${cancelledCredexID}`);
    return cancelledCredexID;
  } catch (error) {
    console.error(`Error cancelling credex for credexID ${credexID}:`, error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
