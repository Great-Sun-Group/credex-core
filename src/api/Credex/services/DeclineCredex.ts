import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";

export async function DeclineCredexService(credexID: string, signerID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (issuer:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex{credexID:$credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Account)
        DELETE rel1, rel2
        CREATE (issuer)-[:DECLINED]->(credex)-[:DECLINED]->(acceptor)
        WITH credex
        SET
            credex.declinedAt = datetime(),
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

    const declinedCredexID = result.records[0].get("credexID");

    // Create digital signature
    const inputData = JSON.stringify({
      credexID: declinedCredexID,
      declinedAt: new Date().toISOString()
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      declinedCredexID,
      "DECLINE_CREDEX",
      inputData
    );

    console.log(`Offer declined for credexID: ${declinedCredexID}`);
    return declinedCredexID;
  } catch (error) {
    console.error(`Error declining credex for credexID ${credexID}:`, error);
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
