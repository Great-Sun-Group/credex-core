import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface DeclineCredexResult {
  credexID: string;
  declinedAt: string;
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
}

/**
 * DeclineCredexService
 * 
 * This service handles the declining of Credex offers.
 * It updates the Credex status and creates an audit trail.
 * 
 * @param credexID - The ID of the Credex to decline
 * @param signerID - The ID of the member declining the Credex
 * @param requestId - The ID of the HTTP request
 * @returns Object containing the declined Credex details
 * @throws CredexError with specific error codes
 */
export async function DeclineCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<DeclineCredexResult> {
  logger.debug("Entering DeclineCredexService", {
    credexID,
    signerID,
    requestId
  });

  if (!credexID || !signerID) {
    throw new CredexError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check current Credex state
    logger.debug("Checking Credex status", {
      credexID,
      requestId
    });

    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (credex:Credex {credexID: $credexID})
        OPTIONAL MATCH (credex)-[r:OFFERS|OWES|DECLINED]-()
        RETURN 
          credex.credexID AS credexID,
          collect(type(r)) AS relationships
      `;

      const result = await tx.run(query, { credexID });

      if (result.records.length === 0) {
        throw new CredexError("Credex not found", "NOT_FOUND");
      }

      const relationships = result.records[0].get('relationships');
      return {
        hasOffers: relationships.includes('OFFERS'),
        hasOwes: relationships.includes('OWES'),
        hasDeclined: relationships.includes('DECLINED')
      };
    });

    if (!checkResult.hasOffers) {
      if (checkResult.hasOwes) {
        throw new CredexError("Cannot decline an accepted Credex", "ALREADY_ACCEPTED");
      }
      if (checkResult.hasDeclined) {
        throw new CredexError("Credex already declined", "ALREADY_DECLINED");
      }
      throw new CredexError("Credex in invalid state", "INVALID_STATE");
    }

    // Decline the Credex
    logger.debug("Declining Credex in database", {
      credexID,
      signerID,
      requestId
    });

    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (issuer:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex {credexID: $credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Account)
        DELETE rel1, rel2
        CREATE (issuer)-[:DECLINED]->(credex)-[:DECLINED]->(acceptor)
        SET
          credex.declinedAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN 
          credex.credexID AS credexID,
          toString(credex.declinedAt) AS declinedAt
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        throw new CredexError("Failed to decline Credex", "DECLINE_FAILED");
      }

      return {
        credexID: queryResult.records[0].get("credexID"),
        declinedAt: queryResult.records[0].get("declinedAt")
      };
    });

    // Create digital signature
    logger.debug("Creating digital signature for declined Credex", {
      credexID,
      signerID,
      requestId
    });

    const inputData = JSON.stringify({
      credexID: result.credexID,
      declinedAt: result.declinedAt,
      signerID
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      result.credexID,
      "DECLINE_CREDEX",
      inputData,
      requestId
    );

    logger.info("Credex declined successfully", {
      credexID: result.credexID,
      signerID,
      requestId
    });

    return result;

  } catch (error) {
    if (error instanceof CredexError) {
      throw error;
    }

    logger.error("Unexpected error in DeclineCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    throw new CredexError(
      `Failed to decline Credex: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting DeclineCredexService", {
      credexID,
      signerID,
      requestId
    });
  }
}
