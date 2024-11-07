import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface CancelRecurringParams {
  recurringID: string;
  ownerID: string;
  requestId: string;
}

interface CancelRecurringResult {
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
 * CancelRecurringService
 * 
 * Handles the cancellation of a recurring transaction template.
 * Updates status and relationships.
 * 
 * @param params - Parameters for cancelling recurring transaction
 * @returns Object containing the cancelled recurring transaction details
 * @throws RecurringError with specific error codes
 */
export async function CancelRecurringService(
  params: CancelRecurringParams
): Promise<CancelRecurringResult> {
  logger.debug("Entering CancelRecurringService", { ...params });

  const { recurringID, ownerID, requestId } = params;
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Verify ownership and current status
    logger.debug("Verifying ownership and status", {
      recurringID,
      ownerID,
      requestId
    });

    const verifyQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (source:Account)-[:REQUESTS|ACTIVE]->(recurring)
        MATCH (owner:Member {memberID: $ownerID})
        RETURN
          recurring,
          source.accountID as sourceAccountID,
          exists((owner)-[:OWNS]->(source)) as isOwner
      `;

      return tx.run(query, { recurringID, ownerID });
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

    if (!isOwner) {
      throw new RecurringError(
        "Only the owner can cancel recurring transactions",
        "UNAUTHORIZED"
      );
    }

    if (recurring.properties.status === "CANCELLED") {
      throw new RecurringError(
        "Recurring transaction already cancelled",
        "ALREADY_CANCELLED"
      );
    }

    // Cancel the recurring transaction
    logger.debug("Cancelling recurring transaction", {
      recurringID,
      ownerID,
      requestId
    });

    const cancelQuery = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (source:Account)-[r1:REQUESTS|ACTIVE]->(recurring)-[r2:REQUESTS|ACTIVE]->(target:Account)
        DELETE r1, r2
        SET
          recurring.status = "CANCELLED",
          recurring.cancelledAt = datetime()
        CREATE (source)-[:CANCELLED]->(recurring)-[:CANCELLED]->(target)
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

    if (cancelQuery.records.length === 0) {
      throw new RecurringError(
        "Failed to cancel recurring transaction",
        "CANCEL_FAILED"
      );
    }

    const cancelledRecord = cancelQuery.records[0];
    const amount = cancelledRecord.get("amount");
    const denomination = cancelledRecord.get("denomination");

    // Create digital signature
    logger.debug("Creating digital signature", {
      recurringID,
      ownerID,
      requestId
    });

    const inputData = JSON.stringify({
      recurringID,
      ownerID,
      sourceAccountID: cancelledRecord.get("sourceAccountID"),
      targetAccountID: cancelledRecord.get("targetAccountID"),
      cancelledAt: new Date().toISOString()
    });

    await digitallySign(
      ledgerSpaceSession,
      ownerID,
      "Recurring",
      recurringID,
      "CANCEL_RECURRING",
      inputData,
      requestId
    );

    const responseData = {
      recurringID,
      scheduleInfo: {
        frequency: cancelledRecord.get("frequency"),
        nextRunDate: cancelledRecord.get("nextRunDate"),
        amount: `${denomFormatter(amount, denomination)} ${denomination}`,
        denomination,
        status: cancelledRecord.get("status")
      },
      participants: {
        sourceAccountID: cancelledRecord.get("sourceAccountID"),
        targetAccountID: cancelledRecord.get("targetAccountID")
      }
    };

    logger.info("Recurring transaction cancelled successfully", {
      recurringID,
      ownerID,
      requestId
    });

    return {
      success: true,
      data: responseData,
      message: "Recurring transaction cancelled successfully"
    };

  } catch (error) {
    if (error instanceof RecurringError) {
      throw error;
    }

    logger.error("Unexpected error in CancelRecurringService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    throw new RecurringError(
      `Failed to cancel recurring transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CancelRecurringService", { requestId });
  }
}
