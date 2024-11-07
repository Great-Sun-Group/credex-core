import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface CancelCredexResult {
  credexID: string;
  cancelledAt: string;
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
}

/**
 * CancelCredexService
 * 
 * This service handles the cancellation of Credex offers.
 * It updates the Credex status and creates an audit trail.
 * 
 * @param credexID - The ID of the Credex to cancel
 * @param signerID - The ID of the member cancelling the Credex
 * @param requestId - The ID of the HTTP request
 * @returns Object containing the cancelled Credex details
 * @throws CredexError with specific error codes
 */
export async function CancelCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<CancelCredexResult> {
  logger.debug("Entering CancelCredexService", {
    credexID,
    signerID,
    requestId
  });

  if (!credexID || !signerID) {
    throw new CredexError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check current Credex state and authorization
    logger.debug("Checking Credex status and authorization", {
      credexID,
      signerID,
      requestId
    });

    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (credex:Credex {credexID: $credexID})
        OPTIONAL MATCH (credex)-[r:OFFERS|OWES|CANCELLED]-()
        OPTIONAL MATCH (issuer:Account)-[:OFFERS]->(credex)
        WHERE exists((issuer)<-[:AUTHORIZED_FOR]-(:Member {memberID: $signerID}))
        RETURN 
          credex.credexID AS credexID,
          collect(type(r)) AS relationships,
          issuer IS NOT NULL AS isAuthorized
      `;

      const result = await tx.run(query, { credexID, signerID });

      if (result.records.length === 0) {
        throw new CredexError("Credex not found", "NOT_FOUND");
      }

      const record = result.records[0];
      const relationships = record.get('relationships');
      const isAuthorized = record.get('isAuthorized');

      return {
        hasOffers: relationships.includes('OFFERS'),
        hasOwes: relationships.includes('OWES'),
        hasCancelled: relationships.includes('CANCELLED'),
        isAuthorized
      };
    });

    if (!checkResult.isAuthorized) {
      throw new CredexError("Not authorized to cancel this Credex", "UNAUTHORIZED");
    }

    if (!checkResult.hasOffers) {
      if (checkResult.hasOwes) {
        throw new CredexError("Cannot cancel an accepted Credex", "ALREADY_ACCEPTED");
      }
      if (checkResult.hasCancelled) {
        throw new CredexError("Credex already cancelled", "ALREADY_CANCELLED");
      }
      throw new CredexError("Credex in invalid state", "INVALID_STATE");
    }

    // Cancel the Credex
    logger.debug("Cancelling Credex in database", {
      credexID,
      signerID,
      requestId
    });

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
        RETURN 
          credex.credexID AS credexID,
          toString(credex.cancelledAt) AS cancelledAt
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        throw new CredexError("Failed to cancel Credex", "CANCEL_FAILED");
      }

      return {
        credexID: queryResult.records[0].get("credexID"),
        cancelledAt: queryResult.records[0].get("cancelledAt")
      };
    });

    // Create digital signature
    logger.debug("Creating digital signature for cancelled Credex", {
      credexID,
      signerID,
      requestId
    });

    const inputData = JSON.stringify({
      credexID: result.credexID,
      cancelledAt: result.cancelledAt,
      signerID
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      result.credexID,
      "CANCEL_CREDEX",
      inputData,
      requestId
    );

    logger.info("Credex cancelled successfully", {
      credexID: result.credexID,
      signerID,
      requestId
    });

    return result;

  } catch (error) {
    if (error instanceof CredexError) {
      throw error;
    }

    logger.error("Unexpected error in CancelCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    throw new CredexError(
      `Failed to cancel Credex: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CancelCredexService", {
      credexID,
      signerID,
      requestId
    });
  }
}
