import { ledgerSpaceDriver } from "../../../config/neo4j";

/**
 * CancelCredexService
 * 
 * This service handles the cancellation of a Credex offer or request.
 * It changes the relationships from OFFERS or REQUESTS to CANCELLED.
 * 
 * @param credexID - The ID of the Credex to be cancelled
 * @returns The ID of the cancelled Credex or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
export async function CancelCredexService(credexID: string): Promise<string | null> {
  if (!credexID) {
    console.error("CancelCredexService: credexID is required");
    return null;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (issuer:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex {credexID: $credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Account)
        WHERE credex.queueStatus <> "PROCESSED"
        DELETE rel1, rel2
        CREATE (issuer)-[:CANCELLED]->(credex)-[:CANCELLED]->(acceptor)
        SET
          credex.cancelledAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN credex.credexID AS credexID
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        console.warn(`No records found or credex no longer pending for credexID: ${credexID}`);
        return null;
      }

      return queryResult.records[0].get("credexID") as string;
    });

    if (result) {
      console.log(`Credex cancelled successfully: ${result}`);
    }

    return result;
  } catch (error) {
    console.error(`Error cancelling credex for credexID ${credexID}:`, error);
    throw new Error(`Failed to cancel Credex: ${(error as Error).message}`);
  } finally {
    await ledgerSpaceSession.close();
  }
}
