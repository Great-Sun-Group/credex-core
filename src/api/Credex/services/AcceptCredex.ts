import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface AcceptCredexResult {
  acceptedCredexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
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
 * @returns An object with the accepted Credex details
 * @throws CredexError with specific error codes
 */
export async function AcceptCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<AcceptCredexResult> {
  logger.debug("Entering AcceptCredexService", { 
    credexID, 
    signerID, 
    requestId 
  });

  if (!credexID || !signerID || !requestId) {
    throw new CredexError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Checking Credex status", { 
      credexID, 
      requestId 
    });

    // Check current Credex state
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
        throw new CredexError("Credex not found", "NOT_FOUND");
      }

      const relationships = result.records[0].get('relationships');
      return {
        hasOffers: relationships.includes('OFFERS'),
        hasOwes: relationships.includes('OWES')
      };
    });

    if (!checkResult.hasOffers && checkResult.hasOwes) {
      throw new CredexError("Credex already accepted", "ALREADY_ACCEPTED");
    }

    if (!checkResult.hasOffers && !checkResult.hasOwes) {
      throw new CredexError("Credex in invalid state", "INVALID_STATE");
    }

    logger.debug("Accepting Credex in database", { 
      credexID, 
      signerID, 
      requestId 
    });

    // Accept the Credex
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
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

      const queryResult = await tx.run(query, { credexID, signerID });
      
      if (queryResult.records.length === 0) {
        throw new CredexError(
          "Failed to accept Credex - authorization check failed", 
          "UNAUTHORIZED"
        );
      }

      const record = queryResult.records[0];
      return {
        acceptedCredexID: record.get("credexID"),
        acceptorAccountID: record.get("acceptorAccountID"),
        acceptorSignerID: record.get("signerID"),
      };
    });

    logger.info("Creating digital signature for accepted Credex", {
      credexID: result.acceptedCredexID,
      signerID,
      requestId
    });

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

    logger.info("Credex accepted successfully", {
      credexID: result.acceptedCredexID,
      signerID,
      requestId
    });

    return result;

  } catch (error) {
    if (error instanceof CredexError) {
      throw error;
    }

    logger.error("Unexpected error in AcceptCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    throw new CredexError(
      `Failed to accept Credex: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AcceptCredexService", { 
      credexID, 
      signerID, 
      requestId 
    });
  }
}
