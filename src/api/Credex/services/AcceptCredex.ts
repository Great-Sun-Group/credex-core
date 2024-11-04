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
 * @throws Error if there's an issue with the database operation or digital signature
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

  let result: AcceptCredexResult | null = null;
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logDebug(`Checking current Credex status`, { 
      credexID, 
      signerID, 
      requestId,
      sessionState: ledgerSpaceSession.lastBookmark()
    });

    // First check if the Credex exists and its current state
    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const checkQuery = `
        MATCH (credex:Credex {credexID: $credexID})
        OPTIONAL MATCH (credex)-[r:OFFERS|OWES]-()
        RETURN 
          credex.credexID AS credexID,
          collect(type(r)) AS relationships
      `;

      const result = await tx.run(checkQuery, { credexID });
      
      if (result.records.length === 0) {
        return { exists: false };
      }

      const relationships = result.records[0].get('relationships');
      return {
        exists: true,
        hasOffers: relationships.includes('OFFERS'),
        hasOwes: relationships.includes('OWES')
      };
    });

    if (!checkResult.exists) {
      logWarning(`Credex not found`, { credexID, signerID, requestId });
      throw new Error('Credex not found');
    }

    if (!checkResult.hasOffers && checkResult.hasOwes) {
      logWarning(`Credex already accepted`, { credexID, signerID, requestId });
      throw new Error('Credex already accepted');
    }

    if (!checkResult.hasOffers && !checkResult.hasOwes) {
      logWarning(`Credex in invalid state - no OFFERS or OWES relationships`, { credexID, signerID, requestId });
      throw new Error('Credex in invalid state');
    }

    logDebug(`Attempting to accept Credex in database`, { 
      credexID, 
      signerID, 
      requestId,
      sessionState: ledgerSpaceSession.lastBookmark() 
    });

result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH
          (issuer:Account)-[rel1:OFFERS]->
          (acceptedCredex:Credex {credexID: $credexID})-[rel2:OFFERS]->
          (acceptor:Account)<-[:AUTHORIZED_FOR]-
          (signer:Member|Avatar { memberID: $signerID })
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

      // Create a new session for digital signature
      const signatureSession = ledgerSpaceDriver.session();
      try {
        const inputData = JSON.stringify({
          acceptedCredexID: result.acceptedCredexID,
          acceptorAccountID: result.acceptorAccountID,
          acceptorSignerID: result.acceptorSignerID,
          acceptedAt: new Date().toISOString()
        });

        await digitallySign(
          signatureSession,
          signerID,
          "Credex",
          result.acceptedCredexID,
          "ACCEPT_CREDEX",
          inputData,
          requestId
        );

        logDebug(`Digital signature created successfully`, { ...result, requestId });
      } catch (error) {
        logError(`Digital signature error for credexID ${credexID}`, error as Error, { 
          credexID, 
          signerID, 
          requestId,
          errorStack: (error as Error).stack
        });
        throw new Error(`Digital signature error: ${(error as Error).message}`);
      } finally {
        await signatureSession.close();
      }
    }

    return result;
  } catch (error) {
    if ((error as Error).message === 'Credex already accepted' ||
        (error as Error).message === 'Credex not found' ||
        (error as Error).message === 'Credex in invalid state' ||
        (error as Error).message.includes('Digital signature error')) {
      throw error; // Re-throw specific errors to be handled by the controller
    }
    
logError(
      `Error accepting credex for credexID ${credexID}`, 
      error as Error, 
      { 
        credexID, 
        signerID, 
        requestId,
        errorStack: (error as Error).stack,
        errorCode: (error as any).code,
        errorMessage: (error as Error).message
      }
    );
    throw new Error(`Failed to accept Credex: ${(error as Error).message}`);
  } finally {
    await ledgerSpaceSession.close();
    logDebug(`Exiting AcceptCredexService`, { credexID, signerID, requestId });
  }
}