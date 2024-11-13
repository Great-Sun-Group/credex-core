import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface CancelCredexData {
  credexID: string;
  cancelledAt: string;
  transactionType: string;
  issuerAccountID: string;
  receiverAccountID: string;
}

interface CancelCredexResult {
  success: boolean;
  data?: CancelCredexData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseCancelResult {
  success: boolean;
  data?: {
    credexID: string;
    cancelledAt: string;
    issuerAccountID: string;
    receiverAccountID: string;
  };
  error?: string;
}

/**
 * CancelCredexService
 * 
 * Handles the cancellation of a Credex transaction. Updates the Credex status from OFFERS/REQUESTS to CANCELLED.
 * For OFFERS: Only the source member (initiator) can cancel
 * For REQUESTS: Only the target member (receiver) can cancel
 * 
 * @param credexID - The ID of the Credex to cancel
 * @param signerID - The ID of the member cancelling the Credex
 * @param requestId - The ID of the HTTP request
 * @returns CancelCredexResult containing cancellation details and status
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
        OPTIONAL MATCH (credex)-[r:OFFERS|REQUESTS|OWES|CANCELLED]-()
        WITH credex, collect(type(r)) as relationships
        OPTIONAL MATCH (source:Account)-[rel:OFFERS|REQUESTS]->(credex)-[rel2:OFFERS|REQUESTS]->(target:Account)
        WHERE (
          // For OFFERS: Only source member can cancel
          (type(rel) = 'OFFERS' AND EXISTS((source)<-[:AUTHORIZED_FOR]-(:Member { memberID: $signerID }))) OR
          // For REQUESTS: Only target member can cancel
          (type(rel) = 'REQUESTS' AND EXISTS((target)<-[:AUTHORIZED_FOR]-(:Member { memberID: $signerID })))
        )
        RETURN 
          credex.credexID AS credexID,
          relationships,
          type(rel) as transactionType,
          source IS NOT NULL AS isAuthorized
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
      const transactionType = record.get('transactionType');

      return {
        success: true,
        hasOffers: relationships.includes('OFFERS'),
        hasRequests: relationships.includes('REQUESTS'),
        hasOwes: relationships.includes('OWES'),
        hasCancelled: relationships.includes('CANCELLED'),
        isAuthorized,
        transactionType
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
      const errorMessage = checkResult.transactionType === 'OFFERS' 
        ? "Only the issuing member can cancel an offer"
        : "Only the receiving member can cancel a request";

      return {
        success: false,
        message: "Not authorized to cancel this Credex",
        error: {
          code: "UNAUTHORIZED",
          details: errorMessage
        }
      };
    }

    if (!checkResult.hasOffers && !checkResult.hasRequests) {
      if (checkResult.hasOwes) {
        return {
          success: false,
          message: "Cannot cancel an accepted Credex",
          error: {
            code: "ALREADY_ACCEPTED",
            details: "This Credex has already been accepted and cannot be cancelled"
          }
        };
      }
      if (checkResult.hasCancelled) {
        return {
          success: false,
          message: "Credex already cancelled",
          error: {
            code: "ALREADY_CANCELLED",
            details: "This Credex has already been cancelled"
          }
        };
      }
      return {
        success: false,
        message: "Credex in invalid state",
        error: {
          code: "INVALID_STATE",
          details: "The Credex is in an invalid state for cancellation"
        }
      };
    }

    // Cancel the Credex
    logger.debug("Cancelling Credex in database", {
      credexID,
      signerID,
      requestId
    });

    const result: DatabaseCancelResult = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (issuer:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex { credexID: $credexID })-[rel2:OFFERS|REQUESTS]->(receiver:Account)
        WHERE credex.queueStatus <> "PROCESSED"
        DELETE rel1, rel2
        CREATE (issuer)-[:CANCELLED]->(credex)-[:CANCELLED]->(receiver)
        SET
          credex.cancelledAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN 
          credex.credexID AS credexID,
          toString(credex.cancelledAt) AS cancelledAt,
          issuer.accountID AS issuerAccountID,
          receiver.accountID AS receiverAccountID
      `;

      const queryResult = await tx.run(query, { credexID });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "CANCEL_FAILED"
        };
      }

      const record = queryResult.records[0];
      return {
        success: true,
        data: {
          credexID: record.get("credexID"),
          cancelledAt: record.get("cancelledAt"),
          issuerAccountID: record.get("issuerAccountID"),
          receiverAccountID: record.get("receiverAccountID")
        }
      };
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Failed to cancel Credex",
        error: {
          code: "CANCEL_FAILED",
          details: "An error occurred while attempting to cancel the Credex"
        }
      };
    }

    // Create digital signature
    logger.debug("Creating digital signature for cancelled Credex", {
      credexID,
      signerID,
      requestId
    });

    const inputData = JSON.stringify({
      credexID: result.data.credexID,
      cancelledAt: result.data.cancelledAt,
      issuerAccountID: result.data.issuerAccountID,
      receiverAccountID: result.data.receiverAccountID,
      signerID
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      result.data.credexID,
      "CANCEL_CREDEX",
      inputData,
      requestId
    );

    logger.info("Credex cancelled successfully", {
      credexID: result.data.credexID,
      signerID,
      requestId
    });

    return {
      success: true,
      data: {
        ...result.data,
        transactionType: "CANCELLED"
      },
      message: "Credex cancelled successfully"
    };

  } catch (error) {
    logger.error("Unexpected error in CancelCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId
    });

    return {
      success: false,
      message: "Failed to cancel Credex",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while cancelling the Credex"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CancelCredexService", {
      credexID,
      signerID,
      requestId
    });
  }
}
