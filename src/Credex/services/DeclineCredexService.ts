/*
marks a credex as declined by changing the relationships
from OFFERS or REQUESTS to DECLINED

required inputs:
  credexID

on success returns credexID

will return false if:
  credexID not found
  credex does not have OFFERS or REQUESTS relationships (credex already accepted/declined/cancelled)
    
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function DeclineCredexService(credexID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    const result = await ledgerSpaceSession.run(
      `
        MATCH (issuer:Member)-[rel1:OFFERS|REQUESTS]->(credex:Credex{credexID:$credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Member)
        DELETE rel1, rel2
        CREATE (issuer)-[:DECLINED]->(credex)-[:DECLINED]->(acceptor)
        WITH credex
        SET
            credex.declinedAt = Datetime(),
            credex.OutstandingAmount = 0,
            credex.queueStatus = "PROCESSED"
        RETURN credex.credexID AS credexID
    `,
      { credexID }
    );
    await ledgerSpaceSession.close();

    if (result.records.length === 0) {
      console.log(
        `No records found or credex no longer pending for credexID: ${credexID}`
      );
      return false;
    }

    const declinedCredexID = result.records[0].get("credexID");
    console.log(`Offer declined for credexID: ${declinedCredexID}`);
    return declinedCredexID;
  } catch (error) {
    console.log(error);
  }
}
