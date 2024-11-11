import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface DeclineCredexData {
  credexID: string;
  declinedAt: string;
  transactionType: string;
  issuerAccountID: string;
  receiverAccountID: string;
}

interface DeclineCredexResult {
  success: boolean;
  data?: DeclineCredexData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseDeclineResult {
  success: boolean;
  data?: {
    credexID: string;
    declinedAt: string;
    issuerAccountID: string;
    receiverAccountID: string;
  };
  error?: string;
}

/**
 * DeclineCredexService
 * 
 * Handles the declining of a Credex offer. Updates the Credex status from OFFERS to DECLINED,
 * creates a digital signature for the decline action, and returns updated Credex details.
 * Only the receiver of a Credex offer can decline it.
 * 
 * @param credexID - The ID of the Credex to decline
 * @param signerID - The ID of the member declining the Credex
 * @param requestId - The ID of the HTTP request
 * @returns DeclineCredexResult containing decline details and status
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
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "credexID and signerID are required"
      }
    };
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
        MATCH (credex:Credex { credexID: $credexID })
        OPTIONAL MATCH (credex)-[r:OFFERS|OWES|DECLINED]-()
        OPTIONAL MATCH (credex)-[:OFFERS]->(receiver:Account)
        WHERE EXISTS((receiver)<-[:AUTHORIZED_FOR]-(:Member { memberID: $signerID }))
        RETURN 
          credex.credexID AS credexID,
          collect(type(r)) AS relationships,
          receiver IS NOT NULL AS isAuthorized
      `;

      const result = await tx.run(query, { credexID, signerID });

      if (result.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND"
        };
      }

      const record = result.records[0];
      const relationships = record.get('relationships');
      const isAuthorized = record.get('isAuthorized');

      return {
        success: true,
        hasOffers: relationships.includes('OFFERS'),
        hasOwes: relationships.includes('OWES'),
        hasDeclined: relationships.includes('DECLINED'),
        isAuthorized
      };
    });

    if (!checkResult.success) {
      return {
        success: false,
        message: "Credex not found",
        error: {
          code: "NOT_FOUND",
          details: "The specified Credex does not exist"
        }
      };
    }

    if (!checkResult.isAuthorized) {
      return {
        success: false,
        message: "Not authorized to decline this Credex",
        error: {
          code: "UNAUTHORIZED",
          details: "You must be authorized for the receiving account to decline this Credex"
        }
      };
    }

    if (!checkResult.hasOffers) {
      if (checkResult.hasOwes) {
        return {
          success: false,
          message: "Cannot decline an accepted Credex",
          error: {
            code: "ALREADY_ACCEPTED",
            details: "This Credex has already been accepted and cannot be declined"
          }
        };
      }
      if (checkResult.hasDeclined) {
        return {
          success: false,
          message: "Credex already declined",
          error: {
            code: "ALREADY_DECLINED",
            details: "This Credex has already been declined"
          }
        };
      }
      return {
        success: false,
        message: "Credex in invalid state",
        error: {
          code: "INVALID_STATE",
          details: "The Credex is in an invalid state for declining"
        }
      };
    }

    // Decline the Credex
    logger.debug("Declining Credex in database", {
      credexID,
      signerID,
      requestId
    });

    const result: DatabaseDeclineResult = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (issuer:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex { credexID: $credexID })-[rel2:OFFERS|REQUESTS]->(receiver:Account)
        WHERE credex.queueStatus <> "PROCESSED"
        DELETE rel1, rel2
        CREATE (issuer)-[:DECLINED]->(credex)-[:DECLINED]->(receiver)
        SET
          credex.declinedAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN 
          credex.credexID AS credexID,
          toString(credex.declinedAt) AS declinedAt,
          issuer.accountID AS issuerAccountID,
          receiver.accountID AS receiverAccountID
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "DECLINE_FAILED"
        };
      }

      const record = queryResult.records[0];
      return {
        success: true,
        data: {
          credexID: record.get("credexID"),
          declinedAt: record.get("declinedAt"),
          issuerAccountID: record.get("issuerAccountID"),
          receiverAccountID: record.get("receiverAccountID")
        }
      };
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Failed to decline Credex",
        error: {
          code: "DECLINE_FAILED",
          details: "An error occurred while attempting to decline the Credex"
        }
      };
    }

    // Create digital signature
    logger.debug("Creating digital signature for declined Credex", {
      credexID,
      signerID,
      requestId
    });

    const inputData = JSON.stringify({
      credexID: result.data.credexID,
      declinedAt: result.data.declinedAt,
      issuerAccountID: result.data.issuerAccountID,
      receiverAccountID: result.data.receiverAccountID,
      signerID
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      result.data.credexID,
      "DECLINE_CREDEX",
      inputData,
      requestId
    );

    logger.info("Credex declined successfully", {
      credexID: result.data.credexID,
      signerID,
      requestId
    });

    return {
      success: true,
      data: {
        ...result.data,
        transactionType: "DECLINED"
      },
      message: "Credex declined successfully"
    };

  } catch (error) {
    logger.error("Unexpected error in DeclineCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    return {
      success: false,
      message: "Failed to decline Credex",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while declining the Credex"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting DeclineCredexService", {
      credexID,
      signerID,
      requestId
    });
  }
}
