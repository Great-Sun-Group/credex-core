import { CreateRecurringService } from "../../../api/Recurring/services/CreateRecurring";
import { AcceptRecurringService } from "../../../api/Recurring/services/AcceptRecurring";
import { DCO_CONSTANTS } from "../constants";
import { Session } from "neo4j-driver";
import logger from "../../../utils/logger";
import { TEMPLATE_TYPES } from "../../../api/Recurring/types";

/**
 * Creates rdubs' DCO_GIVE recurring template.
 */
export async function createDCOrecurringTemplate(
  foundationXOid: string,
  foundationID: string,
  defaultAccountID: string,
  ledgerSpaceSession: Session,
  requestId: string
): Promise<void> {
  logger.info("Creating DCO recurring template", { requestId });

  const recurringData = {
    ownerID: foundationXOid,
    sourceAccountID: defaultAccountID,  // From rdubs
    targetAccountID: foundationID,      // To foundation
    frequency: DCO_CONSTANTS.RECURRING.FREQUENCY,
    startDate: new Date().toISOString().split("T")[0],
    templateType: TEMPLATE_TYPES.DCO_GIVE,
    DCOgiveInCXX: 1,
    DCOdenom: DCO_CONSTANTS.RECURRING.DEFAULT_DENOMINATION,
    requestId,
  };

  logger.debug("Creating DCO_GIVE template", {
    ownerID: recurringData.ownerID,
    sourceAccountID: recurringData.sourceAccountID,
    targetAccountID: recurringData.targetAccountID,
    frequency: recurringData.frequency,
    startDate: recurringData.startDate,
    DCOgiveInCXX: recurringData.DCOgiveInCXX,
    DCOdenom: recurringData.DCOdenom,
    requestId,
  });

  const createResult = await CreateRecurringService(recurringData);

  if (!createResult.success || !createResult.data) {
    logger.error("Failed to create DCO recurring template", {
      error: createResult.message,
      requestId,
    });
    throw new Error("Failed to create DCO recurring template");
  }

  const recurringID = createResult.data.recurringID;

  logger.debug("Accepting DCO_GIVE template", {
    recurringID,
    foundationXOid,
    requestId,
  });

  const acceptResult = await AcceptRecurringService({
    recurringID,
    signerID: foundationXOid,
    requestId,
  });

  if (!acceptResult.success) {
    logger.error("Failed to accept DCO recurring template", {
      error: acceptResult.message,
      requestId,
    });
    throw new Error("Failed to accept DCO recurring template");
  }

  // Store the template ID in the foundation account
  await ledgerSpaceSession.run(
    `
    MATCH (foundation:Account {accountID: $foundationID})
    SET 
      foundation.${DCO_CONSTANTS.AUTHORIZATION.TEMPLATE_PROPERTY} = $templateID,
      foundation.${DCO_CONSTANTS.AUTHORIZATION.TYPE_PROPERTY} = $authType
  `,
    {
      foundationID,
      templateID: recurringID,
      authType: DCO_CONSTANTS.RECURRING.AUTH_TYPE,
    }
  );

  logger.info("DCO recurring template created and accepted", {
    requestId,
    recurringID,
    foundationID,
    defaultAccountID,
  });
}
