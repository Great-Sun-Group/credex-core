import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface CreateRecurringParams {
  ownerID: string;
  sourceAccountID: string;
  targetAccountID: string;
  amount: number;
  denomination: string;
  frequency: string;
  startDate: string;
  duration?: number;
  securedCredex?: boolean;
  requestId: string;
}

interface CreateRecurringResult {
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
 * CreateRecurringService
 * 
 * Creates a new recurring transaction schedule.
 * Validates ownership and creates appropriate relationships.
 * 
 * @param params - Parameters for creating recurring transaction
 * @returns Object containing the created recurring transaction details
 * @throws RecurringError with specific error codes
 */
export async function CreateRecurringService(
  params: CreateRecurringParams
): Promise<CreateRecurringResult> {
  logger.debug("Entering CreateRecurringService", { ...params });

  const {
    ownerID,
    sourceAccountID,
    targetAccountID,
    amount,
    denomination,
    frequency,
    startDate,
    duration,
    securedCredex = false,
    requestId
  } = params;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Verify ownership and authorization
    logger.debug("Verifying ownership and authorization", {
      ownerID,
      sourceAccountID,
      requestId
    });

    const authCheck = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (owner:Member {memberID: $ownerID})
        MATCH (source:Account {accountID: $sourceAccountID})
        MATCH (target:Account {accountID: $targetAccountID})
        RETURN
          exists((owner)-[:OWNS]->(source)) as isOwner,
          source.accountID as sourceID,
          target.accountID as targetID
      `;

      return tx.run(query, {
        ownerID,
        sourceAccountID,
        targetAccountID
      });
    });

    if (authCheck.records.length === 0) {
      throw new RecurringError(
        "Account not found",
        "NOT_FOUND"
      );
    }

    const isOwner = authCheck.records[0].get("isOwner");
    if (!isOwner) {
      throw new RecurringError(
        "Only account owner can create recurring transactions",
        "UNAUTHORIZED"
      );
    }

    // Create the recurring transaction
    logger.debug("Creating recurring transaction", {
      sourceAccountID,
      targetAccountID,
      amount,
      denomination,
      requestId
    });

    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (source:Account {accountID: $sourceAccountID})
        MATCH (target:Account {accountID: $targetAccountID})
        CREATE (recurring:Recurring {
          recurringID: randomUUID(),
          amount: $amount,
          denomination: $denomination,
          frequency: $frequency,
          startDate: date($startDate),
          status: "PENDING",
          securedCredex: $securedCredex,
          createdAt: datetime()
        })
        CREATE (source)-[:REQUESTS]->(recurring)-[:REQUESTS]->(target)
        CREATE (source)-[:REQUESTED]->(recurring)-[:REQUESTED]->(target)
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

      return tx.run(query, {
        sourceAccountID,
        targetAccountID,
        amount,
        denomination,
        frequency,
        startDate,
        securedCredex,
        duration
      });
    });

    if (result.records.length === 0) {
      throw new RecurringError(
        "Failed to create recurring transaction",
        "CREATE_FAILED"
      );
    }

    const record = result.records[0];
    const recurringID = record.get("recurringID");

    // Create digital signature
    logger.debug("Creating digital signature", {
      recurringID,
      ownerID,
      requestId
    });

    const inputData = JSON.stringify({
      recurringID,
      sourceAccountID,
      targetAccountID,
      amount,
      denomination,
      frequency,
      startDate,
      duration,
      securedCredex,
      createdAt: new Date().toISOString()
    });

    await digitallySign(
      ledgerSpaceSession,
      ownerID,
      "Recurring",
      recurringID,
      "CREATE_RECURRING",
      inputData,
      requestId
    );

    const responseData = {
      recurringID,
      scheduleInfo: {
        frequency: record.get("frequency"),
        nextRunDate: record.get("nextRunDate"),
        amount: `${denomFormatter(amount, denomination)} ${denomination}`,
        denomination,
        status: record.get("status")
      },
      participants: {
        sourceAccountID: record.get("sourceAccountID"),
        targetAccountID: record.get("targetAccountID")
      }
    };

    logger.info("Recurring transaction created successfully", {
      recurringID,
      sourceAccountID,
      targetAccountID,
      requestId
    });

    return {
      success: true,
      data: responseData,
      message: "Recurring transaction created successfully"
    };

  } catch (error) {
    if (error instanceof RecurringError) {
      throw error;
    }

    logger.error("Unexpected error in CreateRecurringService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    throw new RecurringError(
      `Failed to create recurring transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CreateRecurringService", { requestId });
  }
}
