import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { denomFormatter } from "../../../utils/denomUtils";
import {
  RecurringTemplate,
  RegularTemplate,
  DCOGiveTemplate,
  TEMPLATE_TYPES,
  TEMPLATE_STATUS,
  RELATIONSHIP_TYPES,
  RecurringError,
} from "../types";
import logger from "../../../utils/logger";

interface CreateRecurringResult {
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

/**
 * CreateRecurringService
 *
 * Creates a new recurring transaction schedule.
 * Supports both regular and DCO_GIVE template types.
 * Creates REQUESTS and REQUESTED relationships for acceptance flow.
 *
 * @param params - Parameters for creating recurring transaction
 * @returns Object containing the created recurring transaction details
 * @throws RecurringError with specific error codes
 */
export async function CreateRecurringService(
  params: RecurringTemplate
): Promise<CreateRecurringResult> {
  logger.debug("Entering CreateRecurringService", { ...params });

  const {
    ownerID,
    sourceAccountID,
    targetAccountID,
    frequency,
    startDate,
    duration,
    templateType,
    requestId,
  } = params;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Verify ownership and authorization
    logger.debug("Verifying ownership and authorization", {
      ownerID,
      sourceAccountID,
      requestId,
    });

    const authCheck = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (owner:Member {memberID: $ownerID})
        MATCH (source:Account {accountID: $sourceAccountID})
        MATCH (target:Account {accountID: $targetAccountID})
        ${
          templateType === TEMPLATE_TYPES.DCO_GIVE
            ? 'WHERE target.accountType = "CREDEX_FOUNDATION"'
            : ""
        }
        RETURN
          exists((owner)-[:OWNS]->(source)) as isOwner,
          source.accountID as sourceID,
          target.accountID as targetID
      `;

      return tx.run(query, {
        ownerID,
        sourceAccountID,
        targetAccountID,
      });
    });

    if (authCheck.records.length === 0) {
      throw new RecurringError(
        templateType === TEMPLATE_TYPES.DCO_GIVE
          ? "Target account must be a foundation account for DCO_GIVE templates"
          : "Account not found",
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
      templateType,
      requestId,
    });

    // Prepare template-specific properties
    const templateProperties =
      templateType === TEMPLATE_TYPES.REGULAR
        ? {
            amount: (params as RegularTemplate).amount,
            denomination: (params as RegularTemplate).denomination,
            securedCredex: (params as RegularTemplate).securedCredex || false,
          }
        : {
            DCOgiveInCXX: (params as DCOGiveTemplate).DCOgiveInCXX,
            DCOdenom: (params as DCOGiveTemplate).DCOdenom,
          };

    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (source:Account {accountID: $sourceAccountID})
        MATCH (target:Account {accountID: $targetAccountID})
        CREATE (recurring:Recurring {
          recurringID: randomUUID(),
          memberID: $ownerID,
          templateType: $templateType,
          frequency: $frequency,
          startDate: date($startDate),
          nextPayDate: date($startDate),
          status: $status,
          createdAt: datetime(),
          ${Object.entries(templateProperties)
            .map(([key, value]) => `${key}: $${key}`)
            .join(",\n          ")}
        })
        CREATE (source)-[:${RELATIONSHIP_TYPES.REQUESTS}]->(recurring)-[:${RELATIONSHIP_TYPES.REQUESTS}]->(target)
        CREATE (source)-[:${RELATIONSHIP_TYPES.REQUESTED}]->(recurring)-[:${RELATIONSHIP_TYPES.REQUESTED}]->(target)
        RETURN
          recurring.recurringID as recurringID,
          recurring.memberID as memberID,
          recurring.frequency as frequency,
          recurring.nextPayDate as nextRunDate,
          recurring.templateType as templateType,
          ${Object.keys(templateProperties)
            .map((key) => `recurring.${key} as ${key}`)
            .join(",\n          ")},
          recurring.status as status,
          source.accountID as sourceAccountID,
          target.accountID as targetAccountID
      `;

      return tx.run(query, {
        sourceAccountID,
        targetAccountID,
        ownerID,
        templateType,
        frequency,
        startDate,
        duration,
        status: TEMPLATE_STATUS.PENDING,
        ...templateProperties,
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
      requestId,
    });

    const inputData = JSON.stringify({
      recurringID,
      sourceAccountID,
      targetAccountID,
      templateType,
      frequency,
      startDate,
      duration,
      ...templateProperties,
      createdAt: new Date().toISOString(),
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

    // Prepare schedule info based on template type
    const scheduleInfo = {
      frequency: record.get("frequency"),
      nextRunDate: record.get("nextRunDate"),
      status: record.get("status"),
      templateType: record.get("templateType"),
      ...(templateType === TEMPLATE_TYPES.REGULAR
        ? {
            amount: `${denomFormatter(record.get("amount"), record.get("denomination"))} ${record.get("denomination")}`,
            denomination: record.get("denomination"),
          }
        : {
            DCOgiveInCXX: `${denomFormatter(record.get("DCOgiveInCXX"), "CXX")} CXX`,
            DCOdenom: record.get("DCOdenom"),
          }),
    };

    const responseData = {
      recurringID,
      scheduleInfo,
      participants: {
        sourceAccountID: record.get("sourceAccountID"),
        targetAccountID: record.get("targetAccountID"),
      },
    };

    logger.info("Recurring transaction created successfully", {
      recurringID,
      memberID: record.get("memberID"),
      sourceAccountID,
      targetAccountID,
      templateType,
      requestId,
    });

    return {
      success: true,
      data: responseData,
      message: "Recurring transaction created successfully",
    };
  } catch (error) {
    if (error instanceof RecurringError) {
      throw error;
    }

    logger.error("Unexpected error in CreateRecurringService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
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
