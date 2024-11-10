import { CreateRecurringService } from "../../../api/Recurring/services/CreateRecurring";
import { AcceptRecurringService } from "../../../api/Recurring/services/AcceptRecurring";
import { DCO_CONSTANTS } from "../constants";
import { Session } from "neo4j-driver";
import logger from "../../../utils/logger";
import { TEMPLATE_TYPES } from "../../../api/Recurring/types";

/**
 * Creates and accepts the DCO recurring template (avatar).
 * The recurring template itself acts as an avatar in the system.
 */
export async function createDCOrecurringTemplate(
  foundationXOid: string,
  foundationID: string,
  ledgerSpaceSession: Session,
  requestId: string
): Promise<void> {
  logger.info("Creating DCO recurring template (avatar)", { requestId });

  // Create recurring template (avatar)
  const recurringData = {
    ownerID: foundationXOid,
    sourceAccountID: foundationID,
    targetAccountID: foundationID, // Foundation to foundation for authorization
    frequency: DCO_CONSTANTS.RECURRING.FREQUENCY,
    startDate: new Date().toISOString().split('T')[0], // Today
    templateType: TEMPLATE_TYPES.DCO_GIVE,
    DCOgiveInCXX: 0, // Amount not relevant for authorization
    DCOdenom: DCO_CONSTANTS.RECURRING.DEFAULT_DENOMINATION,
    requestId
  };

  logger.debug("Creating recurring template", {
    ownerID: recurringData.ownerID,
    sourceAccountID: recurringData.sourceAccountID,
    targetAccountID: recurringData.targetAccountID,
    frequency: recurringData.frequency,
    startDate: recurringData.startDate,
    requestId
  });

  const createResult = await CreateRecurringService(recurringData);

  if (!createResult.success || !createResult.data) {
    logger.error("Failed to create DCO recurring template", {
      error: createResult.message,
      requestId
    });
    throw new Error("Failed to create DCO recurring template");
  }

  const recurringID = createResult.data.recurringID;

  // Store the template ID in the foundation account
  await ledgerSpaceSession.run(`
    MATCH (foundation:Account {accountID: $foundationID})
    SET 
      foundation.${DCO_CONSTANTS.AUTHORIZATION.TEMPLATE_PROPERTY} = $templateID,
      foundation.${DCO_CONSTANTS.AUTHORIZATION.TYPE_PROPERTY} = $authType
  `, {
    foundationID,
    templateID: recurringID,
    authType: DCO_CONSTANTS.RECURRING.AUTH_TYPE
  });

  logger.info("DCO recurring template created and ID stored", {
    requestId,
    recurringID,
    foundationID
  });

  // Accept the recurring template
  logger.debug("Accepting recurring template", {
    requestId,
    recurringID,
    signerID: foundationXOid
  });

  const acceptResult = await AcceptRecurringService({
    recurringID,
    signerID: foundationXOid,
    requestId
  });

  if (!acceptResult.success) {
    logger.error("Failed to accept DCO recurring template", {
      error: acceptResult.message,
      requestId
    });
    throw new Error("Failed to accept DCO recurring template");
  }

  logger.info("DCO recurring template (avatar) created and accepted successfully", {
    requestId,
    recurringID
  });
}
