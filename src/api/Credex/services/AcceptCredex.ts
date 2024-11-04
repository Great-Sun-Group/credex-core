import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

interface AcceptCredexResult {
  acceptedCredexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
}

/**
 * AcceptCredexService
 *
 * This service handles the acceptance of a Credex offer.
 * It updates the Credex status from OFFERS to OWES and signs the acceptance.
 *
 * @param credexID - The ID of the Credex to be accepted
 * @param signerID - The ID of the Member or Avatar signing the acceptance
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @returns An object with the accepted Credex details or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
export async function AcceptCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<AcceptCredexResult | null> {
  logDebug(`Entering AcceptCredexService`, { credexID, signerID, requestId });

  if (!credexID || !signerID || !requestId) {
    logError("AcceptCredexService: Missing required parameters", new Error("Missing parameters"), { credexID, signerID, requestId });
    return null;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logDebug(`Attempting to accept Credex in database`, { 
      credexID, 
      signerID, 
      requestId,
      sessionState: ledgerSpaceSession.lastBookmark() 
    });

    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // First, verify the nodes exist
      const verifyQuery = `
        MATCH (credex:Credex {credexID: $credexID})
        MATCH (signer:Member|Avatar {memberID: $signerID})
        RETURN 
          credex IS NOT NULL as credexExists,
          signer IS NOT NULL as signerExists
      `;
      
      const verifyResult = await tx.run(verifyQuery, { credexID, signerID });
      
      if (verifyResult.records.length === 0) {
        logError("Verification failed - Credex or Signer not found", new Error("Entities not found"), {
          credexID,
          signerID,
          requestId
        });
        return null;
      }

      const query = `
        MATCH
          (issuer:Account)-[rel1:OFFERS]->
          (acceptedCredex:Credex {credexID: $credexID})-[rel2:OFFERS]->
          (acceptor:Account)<-[:AUTHORIZED_FOR]-
          (signer:Member|Avatar { memberID: $signerID })
        WITH issuer, rel1, acceptedCredex, rel2, acceptor, signer
        WHERE acceptedCredex IS NOT NULL 
          AND signer IS NOT NULL
          AND rel1 IS NOT NULL
          AND rel2 IS NOT NULL
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        SET acceptedCredex.acceptedAt = datetime()
        RETURN
          acceptedCredex.credexID AS credexID,
          acceptor.accountID AS acceptorAccountID,
          signer.memberID AS signerID
      `;

      try {
        const queryResult = await tx.run(query, { credexID, signerID });
        
        if (queryResult.records.length === 0) {
          logWarning(
            `No matching records found for acceptance pattern. Debugging info:`,
            { 
              credexID, 
              signerID, 
              requestId,
              summary: queryResult.summary.counters.updates()
            }
          );
          return null;
        }

        const record = queryResult.records[0];
        return {
          acceptedCredexID: record.get("credexID"),
          acceptorAccountID: record.get("acceptorAccountID"),
          acceptorSignerID: record.get("signerID"),
        };
      } catch (txError) {
        logError(
          "Transaction error during Credex acceptance", 
          txError as Error,
          {
            credexID,
            signerID,
            requestId,
            errorCode: (txError as any).code,
            errorMessage: (txError as Error).message
          }
        );
        throw txError;
      }
    });

    if (result) {
      logInfo(`Offer accepted for credexID: ${result.acceptedCredexID}`, { ...result, requestId });
      logDebug(`Preparing to create digital signature for accepted Credex`, { ...result, requestId });

      // Create digital signature
      const inputData = JSON.stringify({
        acceptedCredexID: result.acceptedCredexID,
        acceptorAccountID: result.acceptorAccountID,
        acceptorSignerID: result.acceptorSignerID,
        acceptedAt: new Date().toISOString()
      });

      await digitallySign(
        ledgerSpaceSession,
        signerID,
        "Credex",
        result.acceptedCredexID,
        "ACCEPT_CREDEX",
        inputData,
        requestId
      );

      logDebug(`Digital signature created successfully`, { ...result, requestId });
      // TODO: Implement credex accepted notification here
    }

    return result;
  } catch (error) {
    logError(
      `Error accepting credex for credexID ${credexID}`, 
      error as Error, 
      { 
        credexID, 
        signerID, 
        requestId,
        errorStack: (error as Error).stack,
        errorCode: (error as any).code
      }
    );
    throw new Error(`Failed to accept Credex: ${(error as Error).message}`);
  } finally {
    await ledgerSpaceSession.close();
    logDebug(`Exiting AcceptCredexService`, { credexID, signerID, requestId });
  }
}
