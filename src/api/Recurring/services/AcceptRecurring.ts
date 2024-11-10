import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { denomFormatter } from "../../../utils/denomUtils";
import { TEMPLATE_TYPES, TEMPLATE_STATUS, RELATIONSHIP_TYPES } from "../types";
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
      amount?: string;
      DCOgiveInCXX?: string;
      denomination?: string;
      DCOdenom?: string;
      status: string;
      templateType: string;
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
 * Removes REQUESTS relationships and adds ACTIVE relationships.
 * Keeps REQUESTED relationships for history.
 * Note: DCO_GIVE templates are automatically accepted without signature.
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
        MATCH (source:Account)-[r1:${RELATIONSHIP_TYPES.REQUESTS}]->(recurring)-[r2:${RELATIONSHIP_TYPES.REQUESTS}]->(target:Account)
        MATCH (signer:Member {memberID: $signerID})
        RETURN
          recurring,
          target.accountID as targetAccountID,
          exists((signer)-[:OWNS]->(target)) as isOwner,
          exists((signer)-[:AUTHORIZED_FOR]->(target)) as isAuthorized,
          source.accountID as sourceAccountID
      `;

      return tx.run(query, { recurringID, signerID });
    });

    if (verifyQuery.records.length === 0) {
      throw new RecurringError(
        "Recurring transaction not found or already accepted",
        "NOT_FOUND"
      );
    }

    const record = verifyQuery.records[0];
    const recurring = record.get("recurring");
    const isOwner = record.get("isOwner");
    const isAuthorized = record.get("isAuthorized");
    const templateType = recurring.properties.templateType;
    const sourceAccountID = record.get("sourceAccountID");
    const targetAccountID = record.get("targetAccountID");

    // Skip authorization check for DCO_GIVE templates
    if (templateType !== TEMPLATE_TYPES.DCO_GIVE && !isOwner && !isAuthorized) {
      throw new RecurringError(
        "Not authorized to accept this recurring transaction",
        "UNAUTHORIZED"
      );
    }

    // Accept the recurring transaction
    logger.debug("Accepting recurring transaction", {
      recurringID,
      signerID,
      templateType,
      requestId
    });

    const acceptQuery = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (source:Account {accountID: $sourceAccountID})
        MATCH (target:Account {accountID: $targetAccountID})
        MATCH (source)-[r1:${RELATIONSHIP_TYPES.REQUESTS}]->(recurring)-[r2:${RELATIONSHIP_TYPES.REQUESTS}]->(target)
        DELETE r1, r2
        SET
          recurring.status = $status,
          recurring.acceptedAt = datetime()
        CREATE (source)-[:${RELATIONSHIP_TYPES.ACTIVE}]->(recurring)-[:${RELATIONSHIP_TYPES.ACTIVE}]->(target)
        RETURN
          recurring.recurringID as recurringID,
          recurring.frequency as frequency,
          recurring.startDate as nextRunDate,
          recurring.templateType as templateType,
          recurring.amount as amount,
          recurring.denomination as denomination,
          recurring.DCOgiveInCXX as DCOgiveInCXX,
          recurring.DCOdenom as DCOdenom,
          recurring.status as status,
          source.accountID as sourceAccountID,
          target.accountID as targetAccountID
      `;

      return tx.run(query, { 
        recurringID,
        sourceAccountID,
        targetAccountID,
        status: TEMPLATE_STATUS.ACTIVE
      });
    });

    if (acceptQuery.records.length === 0) {
      throw new RecurringError(
        "Failed to accept recurring transaction",
        "ACCEPT_FAILED"
      );
    }

    const acceptedRecord = acceptQuery.records[0];

    // Create digital signature only for regular templates
    if (templateType !== TEMPLATE_TYPES.DCO_GIVE) {
      logger.debug("Creating digital signature for regular template", {
        recurringID,
        signerID,
        requestId
      });

      const inputData = JSON.stringify({
        recurringID,
        signerID,
        sourceAccountID,
        targetAccountID,
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
    } else {
      logger.debug("Skipping digital signature for DCO_GIVE template", {
        recurringID,
        requestId
      });
    }

    // Prepare schedule info based on template type
    const scheduleInfo = {
      frequency: acceptedRecord.get("frequency"),
      nextRunDate: acceptedRecord.get("nextRunDate"),
      status: acceptedRecord.get("status"),
      templateType: acceptedRecord.get("templateType"),
      ...(templateType === TEMPLATE_TYPES.REGULAR ? {
        amount: `${denomFormatter(acceptedRecord.get("amount"), acceptedRecord.get("denomination"))} ${acceptedRecord.get("denomination")}`,
        denomination: acceptedRecord.get("denomination")
      } : {
        DCOgiveInCXX: `${denomFormatter(acceptedRecord.get("DCOgiveInCXX"), "CXX")} CXX`,
        DCOdenom: acceptedRecord.get("DCOdenom")
      })
    };

    const responseData = {
      recurringID,
      scheduleInfo,
      participants: {
        sourceAccountID: acceptedRecord.get("sourceAccountID"),
        targetAccountID: acceptedRecord.get("targetAccountID")
      }
    };

    logger.info("Recurring transaction accepted successfully", {
      recurringID,
      signerID,
      templateType,
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
