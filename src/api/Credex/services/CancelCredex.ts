import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

/**
 * CancelCredexService
 * 
 * This service handles the cancellation of a Credex offer or request.
 * It changes the relationships from OFFERS or REQUESTS to CANCELLED.
 * 
 * @param credexID - The ID of the Credex to be cancelled
 * @param signerID - The ID of the member or avatar cancelling the Credex
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns The ID of the cancelled Credex or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
export async function CancelCredexService(credexID: string, signerID: string, requestId: string): Promise<string | null> {
  logDebug(`Entering CancelCredexService`, { credexID, signerID, requestId });

  if (!credexID || !signerID) {
    logError("CancelCredexService: credexID and signerID are required", new Error("Missing parameters"), { credexID, signerID, requestId });
    return null;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logDebug(`Attempting to cancel Credex in database`, { credexID, signerID, requestId });

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
        logWarning(`No records found or credex no longer pending for credexID: ${credexID}`, { credexID, signerID, requestId });
        return null;
      }

      return queryResult.records[0].get("credexID") as string;
    });

    if (result) {
      logInfo(`Credex cancelled successfully: ${result}`, { credexID: result, signerID, requestId });
      logDebug(`Preparing to create digital signature for cancelled Credex`, { credexID: result, signerID, requestId });

      // Create digital signature with audit log
      const inputData = JSON.stringify({
        credexID: result,
        cancelledAt: new Date().toISOString()
      });

      await digitallySign(
        ledgerSpaceSession,
        signerID,
        "Credex",
        result,
        "CANCEL_CREDEX",
        inputData,
        requestId
      );

      logDebug(`Digital signature created successfully`, { credexID: result, signerID, requestId });
    }

    return result;
  } catch (error) {
    logError(`Error cancelling credex for credexID ${credexID}`, error as Error, { credexID, signerID, requestId });
    throw new Error(`Failed to cancel Credex: ${(error as Error).message}`);
  } finally {
    await ledgerSpaceSession.close();
    logDebug(`Exiting CancelCredexService`, { credexID, signerID, requestId });
  }
}
