import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface AcceptRecurringParams {
  recurringID: string;
  signerID: string;
  requestId: string;
}

interface AcceptRecurringResult {
  success: boolean;
  data?: {
    recurringID: string;
    scheduleInfo: {
      frequency: string;
      nextRunDate: string;
      amount: string;
      denomination: string;
      status: string;
    };
    participants: {
      sourceAccountID: string;
      targetAccountID: string;
    };
  };
  message: string;
}

class RecurringError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RecurringError';
  }
}

/**
 * AcceptRecurringService
 * 
 * Handles the acceptance of a recurring transaction template.
 * Updates status and creates necessary relationships.
 * 
 * @param params - Parameters for accepting recurring transaction
 * @returns Object containing the accepted recurring transaction details
 * @throws RecurringError with specific error codes
 */
export async function AcceptRecurringService(
  params: AcceptRecurringParams
): Promise<AcceptRecurringResult> {
  logger.debug("Entering AcceptRecurringService", { ...params });

  const { recurringID, signerID, requestId } = params;
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Verify authorization and current status
    logger.debug("Verifying authorization and status", {
      recurringID,
      signerID,
      requestId
    });

    const verifyQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (recurring)-[:REQUESTS]->(target:Account)
        MATCH (signer:Member {memberID: $signerID})
        RETURN
          recurring,
          target.accountID as targetAccountID,
          exists((signer)-[:OWNS]->(target)) as isOwner,
          exists((signer)-[:AUTHORIZED_FOR]->(target)) as isAuthorized
      `;

      return tx.run(query, { recurringID, signerID });
    });

    if (verifyQuery.records.length === 0) {
      throw new RecurringError(
        "Recurring transaction not found",
        "NOT_FOUND"
      );
    }

    const record = verifyQuery.records[0];
    const recurring = record.get("recurring");
    const isOwner = record.get("isOwner");
    const isAuthorized = record.get("isAuthorized");

    if (!isOwner && !isAuthorized) {
      throw new RecurringError(
        "Not authorized to accept this recurring transaction",
        "UNAUTHORIZED"
      );
    }

    if (recurring.properties.status !== "PENDING") {
      throw new RecurringError(
        "Recurring transaction already processed",
        "ALREADY_PROCESSED"
      );
    }

    // Accept the recurring transaction
    logger.debug("Accepting recurring transaction", {
      recurringID,
      signerID,
      requestId
    });

    const acceptQuery = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (source:Account)-[r1:REQUESTS]->(recurring)-[r2:REQUESTS]->(target:Account)
        DELETE r1, r2
        SET
          recurring.status = "ACTIVE",
          recurring.acceptedAt = datetime()
        CREATE (source)-[:ACTIVE]->(recurring)-[:ACTIVE]->(target)
        RETURN
          recurring.recurringID as recurringID,
          recurring.frequency as frequency,
          recurring.startDate as nextRunDate,
          recurring.amount as amount,
          recurring.denomination as denomination,
          recurring.status as status,
          source.accountID as sourceAccountID,
          target.accountID as targetAccountID
      `;

      return tx.run(query, { recurringID });
    });

    if (acceptQuery.records.length === 0) {
      throw new RecurringError(
        "Failed to accept recurring transaction",
        "ACCEPT_FAILED"
      );
    }

    const acceptedRecord = acceptQuery.records[0];
    const amount = acceptedRecord.get("amount");
    const denomination = acceptedRecord.get("denomination");

    // Create digital signature
    logger.debug("Creating digital signature", {
      recurringID,
      signerID,
      requestId
    });

    const inputData = JSON.stringify({
      recurringID,
      signerID,
      sourceAccountID: acceptedRecord.get("sourceAccountID"),
      targetAccountID: acceptedRecord.get("targetAccountID"),
      acceptedAt: new Date().toISOString()
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Recurring",
      recurringID,
      "ACCEPT_RECURRING",
      inputData,
      requestId
    );

    const responseData = {
      recurringID,
      scheduleInfo: {
        frequency: acceptedRecord.get("frequency"),
        nextRunDate: acceptedRecord.get("nextRunDate"),
        amount: `${denomFormatter(amount, denomination)} ${denomination}`,
        denomination,
        status: acceptedRecord.get("status")
      },
      participants: {
        sourceAccountID: acceptedRecord.get("sourceAccountID"),
        targetAccountID: acceptedRecord.get("targetAccountID")
      }
    };

    logger.info("Recurring transaction accepted successfully", {
      recurringID,
      signerID,
      requestId
    });

    return {
      success: true,
      data: responseData,
      message: "Recurring transaction accepted successfully"
    };

  } catch (error) {
    if (error instanceof RecurringError) {
      throw error;
    }

    logger.error("Unexpected error in AcceptRecurringService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    throw new RecurringError(
      `Failed to accept recurring transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting AcceptRecurringService", { requestId });
  }
}
