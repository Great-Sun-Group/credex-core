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

export async function CancelCredexService(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<CancelCredexResult> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check authorization
    const checkResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (member:Member { memberID: $signerID })
        -[:AUTHORIZED_FOR]->(account:Account)
        -[:OFFERS]->(credex:Credex { credexID: $credexID })
        RETURN account.accountID as issuerAccountID, credex.credexID as credexID

        UNION

        MATCH (member:Member { memberID: $signerID })
        -[:AUTHORIZED_FOR]->(account:Account)
        <-[:REQUESTS]-(credex:Credex { credexID: $credexID })
        RETURN account.accountID as issuerAccountID, credex.credexID as credexID
      `;

      const result = await tx.run(query, { credexID, signerID });

      if (result.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND"
        };
      }

      const record = result.records[0];
      return {
        success: true,
        issuerAccountID: record.get('issuerAccountID')
      };
    });

    if (!checkResult.success) {
      return {
        success: false,
        message: "Credex not found or already processed",
        error: {
          code: "NOT_FOUND",
          details: "The Credex does not exist, is in wrong state, or you are not authorized"
        }
      };
    }

    // Cancel the Credex
    const result: DatabaseCancelResult = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (source:Account)-[rel1:OFFERS|REQUESTS]->(credex:Credex { credexID: $credexID })-[rel2:OFFERS|REQUESTS]->(target:Account)
        WHERE type(rel1) = type(rel2)
        DELETE rel1, rel2
        CREATE (source)-[:CANCELLED]->(credex)-[:CANCELLED]->(target)
        SET
          credex.cancelledAt = datetime(),
          credex.OutstandingAmount = 0,
          credex.queueStatus = "PROCESSED"
        RETURN 
          credex.credexID AS credexID,
          toString(credex.cancelledAt) AS cancelledAt,
          source.accountID AS issuerAccountID,
          target.accountID AS receiverAccountID
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
  }
}
