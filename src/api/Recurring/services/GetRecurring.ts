import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface GetRecurringParams {
  recurringID: string;
  accountID: string;
  requestId: string;
}

interface GetRecurringResult {
  success: boolean;
  data?: {
    recurringID: string;
    scheduleInfo: {
      frequency: string;
      nextRunDate: string;
      amount: string;
      denomination: string;
      status: string;
      remainingPays?: number;
      daysBetweenPays: number;
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
 * GetRecurringService
 * 
 * Retrieves details of a recurring transaction template.
 * Includes schedule information and remaining executions.
 * 
 * @param params - Parameters for retrieving recurring transaction
 * @returns Object containing the recurring transaction details
 * @throws RecurringError with specific error codes
 */
export async function GetRecurringService(
  params: GetRecurringParams
): Promise<GetRecurringResult> {
  logger.debug("Entering GetRecurringService", { ...params });

  const { recurringID, accountID, requestId } = params;
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Verify access and get recurring details
    logger.debug("Retrieving recurring transaction details", {
      recurringID,
      accountID,
      requestId
    });

    const query = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (recurring:Recurring {recurringID: $recurringID})
        MATCH (source:Account)-[:REQUESTS|ACTIVE|CANCELLED]->(recurring)-[:REQUESTS|ACTIVE|CANCELLED]->(target:Account)
        WHERE source.accountID = $accountID OR target.accountID = $accountID
        RETURN
          recurring.recurringID as recurringID,
          recurring.frequency as frequency,
          recurring.startDate as nextRunDate,
          recurring.amount as amount,
          recurring.denomination as denomination,
          recurring.status as status,
          recurring.remainingPays as remainingPays,
          recurring.daysBetweenPays as daysBetweenPays,
          source.accountID as sourceAccountID,
          target.accountID as targetAccountID
      `;

      return tx.run(query, { recurringID, accountID });
    });

    if (query.records.length === 0) {
      throw new RecurringError(
        "Recurring transaction not found or not accessible",
        "NOT_FOUND"
      );
    }

    const record = query.records[0];
    const amount = record.get("amount");
    const denomination = record.get("denomination");
    const remainingPays = record.get("remainingPays");

    const responseData = {
      recurringID: record.get("recurringID"),
      scheduleInfo: {
        frequency: record.get("frequency"),
        nextRunDate: record.get("nextRunDate"),
        amount: `${denomFormatter(amount, denomination)} ${denomination}`,
        denomination,
        status: record.get("status"),
        daysBetweenPays: record.get("daysBetweenPays"),
        ...(remainingPays !== null && { remainingPays })
      },
      participants: {
        sourceAccountID: record.get("sourceAccountID"),
        targetAccountID: record.get("targetAccountID")
      }
    };

    logger.info("Recurring transaction details retrieved successfully", {
      recurringID,
      accountID,
      requestId
    });

    return {
      success: true,
      data: responseData,
      message: "Recurring transaction details retrieved successfully"
    };

  } catch (error) {
    if (error instanceof RecurringError) {
      throw error;
    }

    logger.error("Unexpected error in GetRecurringService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    throw new RecurringError(
      `Failed to retrieve recurring transaction details: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetRecurringService", { requestId });
  }
}
