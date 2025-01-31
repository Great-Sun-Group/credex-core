import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface AcceptCredexData {
  credexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
  acceptedAt: string;
  transactionType: string;
  amount: string;
  denomination: string;
  secured: boolean;
  issuerAccountID: string;
  issuerAccountName: string;
  issuerMemberID: string | null;
}

interface AcceptCredexResult {
  success: boolean;
  data?: AcceptCredexData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseAcceptResult {
  success: boolean;
  data?: AcceptCredexData;
  error?: string;
}

class CredexError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CredexError";
  }
}

/**
 * AcceptCredexService
 *
 * Handles the acceptance of a Credex offer. Updates the Credex status from OFFERS to OWES,
 * creates a digital signature for the acceptance, and returns updated Credex details.
 *
 * @param credexID - The ID of the Credex to be accepted
 * @param signerID - The ID of the Member or Recurring node signing the acceptance
 * @param requestId - The ID of the HTTP request that initiated this operation
 * @param isBulkOperation - Whether this is part of a bulk operation
 * @param bulkCredexIds - Array of all credex IDs in the bulk operation (only used if isBulkOperation is true)
 * @returns AcceptCredexResult containing acceptance details and status
 * @throws CredexError with specific error codes
 */
export async function AcceptCredexService(
  credexID: string,
  signerID: string,
  requestId: string,
  isBulkOperation: boolean = false,
  bulkCredexIds: string[] = []
): Promise<AcceptCredexResult> {
  logger.debug("Entering AcceptCredexService", {
    credexID,
    signerID,
    requestId,
    isBulkOperation,
    bulkCredexIds: isBulkOperation ? bulkCredexIds : undefined,
  });

  if (!credexID || !signerID || !requestId) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "credexID, signerID, and requestId are required",
      },
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Checking Credex status", {
      credexID,
      requestId,
    });

    // Check current Credex state
    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const checkQuery = `
        MATCH (credex:Credex { credexID: $credexID })
        OPTIONAL MATCH (credex)-[r:OFFERS|OWES]-()
        RETURN 
          credex.credexID AS credexID,
          collect(type(r)) AS relationships
      `;

      const result = await tx.run(checkQuery, { credexID });

      if (result.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND",
        };
      }

      const relationships = result.records[0].get("relationships");
      return {
        success: true,
        hasOffers: relationships.includes("OFFERS"),
        hasOwes: relationships.includes("OWES"),
      };
    });

    if (!checkResult.success) {
      return {
        success: false,
        message: "Credex not found",
        error: {
          code: "NOT_FOUND",
          details: "The specified Credex does not exist",
        },
      };
    }

    if (!checkResult.hasOffers && checkResult.hasOwes) {
      return {
        success: false,
        message: "Credex has already been accepted",
        error: {
          code: "ALREADY_ACCEPTED",
          details:
            "This Credex has already been accepted and cannot be accepted again",
        },
      };
    }

    if (!checkResult.hasOffers && !checkResult.hasOwes) {
      return {
        success: false,
        message: "Credex is in an invalid state",
        error: {
          code: "INVALID_STATE",
          details: "The Credex is neither in OFFERS nor OWES state",
        },
      };
    }

    logger.debug("Accepting Credex in database", {
      credexID,
      signerID,
      requestId,
    });

    // Accept the Credex with updated authorization check
    const result: DatabaseAcceptResult = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        const query = `
        MATCH
          (issuer:Account)-[rel1:OFFERS]->
          (acceptedCredex:Credex { credexID: $credexID })-[rel2:OFFERS]->
          (acceptor:Account)
        MATCH (signer)
        WHERE (
          // Direct Member authorization
          signer:Member AND
          signer.memberID = $signerID AND
          EXISTS((acceptor)<-[:AUTHORIZED_FOR]-(signer))
        ) OR (
          // Recurring node authorization
          signer:Recurring AND
          signer.recurringID = $signerID AND
          EXISTS {
            MATCH (m:Member)-[:OWNS]->(acceptor)
            WHERE EXISTS((m)-[:OWNS]->(:Account)-[:ACTIVE]->(signer))
          }
        )
        WITH DISTINCT issuer, acceptedCredex, rel1, rel2, acceptor, signer
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        SET 
          acceptedCredex.acceptedAt = datetime(),
          acceptedCredex.queueStatus = "PENDING_CREDEX"
        RETURN
          acceptedCredex.credexID AS credexID,
          acceptor.accountID AS acceptorAccountID,
          CASE
            WHEN signer:Member THEN signer.memberID
            WHEN signer:Recurring THEN signer.recurringID
          END AS signerID,
          toString(acceptedCredex.acceptedAt) AS acceptedAt,
          acceptedCredex.InitialAmount / acceptedCredex.CXXmultiplier AS amount,
          acceptedCredex.Denomination AS denomination,
          acceptedCredex.securedCredex AS secured,
          issuer.accountID AS issuerAccountID,
          issuer.accountName AS issuerAccountName,
          CASE WHEN exists((issuer)-[:SEND_OFFERS_TO]->(:Member)) 
               THEN [(issuer)-[:SEND_OFFERS_TO]->(m:Member) | m.memberID][0]
               ELSE null
          END AS issuerMemberID
      `;

        const queryResult = await tx.run(query, { credexID, signerID });

        if (queryResult.records.length === 0) {
          return {
            success: false,
            error: "UNAUTHORIZED",
          };
        }

        const record = queryResult.records[0];
        return {
          success: true,
          data: {
            credexID: record.get("credexID"),
            acceptorAccountID: record.get("acceptorAccountID"),
            acceptorSignerID: record.get("signerID"),
            acceptedAt: record.get("acceptedAt"),
            transactionType: "OWES",
            amount: record.get("amount").toString(),
            denomination: record.get("denomination"),
            secured: record.get("secured"),
            issuerAccountID: record.get("issuerAccountID"),
            issuerAccountName: record.get("issuerAccountName"),
            issuerMemberID: record.get("issuerMemberID"),
          },
        };
      }
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Failed to accept Credex - authorization check failed",
        error: {
          code: "UNAUTHORIZED",
          details: "You are not authorized to accept this Credex",
        },
      };
    }

    const acceptedCredexData = result.data;
    logger.info("Creating digital signature for accepted Credex", {
      credexID: acceptedCredexData.credexID,
      signerID,
      requestId,
      isBulkOperation,
    });

    // Create digital signature
    const inputData = JSON.stringify({
      acceptedCredexID: acceptedCredexData.credexID,
      acceptorAccountID: acceptedCredexData.acceptorAccountID,
      acceptorSignerID: acceptedCredexData.acceptorSignerID,
      acceptedAt: acceptedCredexData.acceptedAt,
      ...(isBulkOperation && { bulkOperationIds: bulkCredexIds }),
    });

    // Only create signature for non-bulk operations or for the last credex in a bulk operation
    if (
      !isBulkOperation ||
      (isBulkOperation && credexID === bulkCredexIds[bulkCredexIds.length - 1])
    ) {
      const acceptedCredexID = acceptedCredexData.credexID; // Store in variable for type safety
      await digitallySign(
        ledgerSpaceSession,
        signerID,
        "Credex",
        acceptedCredexData.credexID,
        "ACCEPT_CREDEX",
        inputData,
        requestId,
        isBulkOperation
          ? {
              additionalEntityIds: bulkCredexIds.filter(
                (id) => id !== acceptedCredexID
              ),
            }
          : undefined
      );
    }

    logger.info("Credex accepted successfully", {
      credexID: acceptedCredexData.credexID,
      signerID,
      requestId,
      isBulkOperation,
    });

    return {
      success: true,
      data: acceptedCredexData,
      message: "Credex accepted successfully",
    };
  } catch (error) {
    logger.error("Unexpected error in AcceptCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      signerID,
      requestId,
      isBulkOperation,
    });

    return {
      success: false,
      message: "Failed to accept Credex",
      error: {
        code: "INTERNAL_ERROR",
        details:
          error instanceof Error
            ? error.message
            : "An unknown error occurred while accepting the Credex",
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AcceptCredexService", {
      credexID,
      signerID,
      requestId,
      isBulkOperation,
    });
  }
}
