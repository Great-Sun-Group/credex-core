import { v4 as uuidv4 } from "uuid";
import { Session } from "neo4j-driver";
import { logInfo, logWarning, logError } from "../../../utils/logger";
import {
  validateAmount,
  validateDenomination,
} from "../../../utils/validators";
import { GetRecurringService } from "../../../api/Recurring/services/GetRecurring";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { DCO_CONSTANTS } from "../constants";
import { Participant, ParticipantData } from "./types";

/**
 * Custom error class for DCO-related errors
 */
class DCOError extends Error {
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, DCOError.prototype);
    
    this.name = 'DCOError';
    this.context = context;
  }

  getContext(): Record<string, unknown> {
    return this.context;
  }
}

/**
 * Verifies DCO authorization using recurring template
 */
async function verifyDCOAuthorization(
  session: Session,
  foundationID: string,
  foundationXOid: string
): Promise<string> {
  // Get template ID and verify authorization type
  const authResult = await session.run(`
    MATCH (foundation:Account {accountID: $foundationID})
    WHERE foundation.${DCO_CONSTANTS.AUTHORIZATION.TYPE_PROPERTY} = $authType
    RETURN foundation.${DCO_CONSTANTS.AUTHORIZATION.TEMPLATE_PROPERTY} as templateID
  `, { 
    foundationID,
    authType: DCO_CONSTANTS.RECURRING.AUTH_TYPE
  });

  const templateID = authResult.records[0]?.get("templateID");
  if (!templateID) {
    const error = new DCOError("DCO authorization template not found", { foundationID });
    logError(error.message, error);
    throw error;
  }

  // Verify template is active
  const templateResult = await GetRecurringService({
    recurringID: templateID,
    accountID: foundationID,
    memberID: foundationXOid,
    requestId: uuidv4()
  });

  if (!templateResult.success || !templateResult.data) {
    const error = new DCOError("Failed to verify DCO authorization", { templateID });
    logError(error.message, error);
    throw error;
  }

  if (templateResult.data.scheduleInfo.status !== DCO_CONSTANTS.AUTHORIZATION.REQUIRED_STATUS) {
    const error = new DCOError("DCO authorization template not active", {
      templateID,
      status: templateResult.data.scheduleInfo.status
    });
    logError(error.message, error);
    throw error;
  }

  return templateID;
}

/**
 * Processes a single DCO give transaction
 */
async function processDCOGiveTransaction(
  participant: Participant,
  foundationID: string,
  foundationXOid: string,
  templateID: string
): Promise<void> {
  if (
    !validateDenomination(participant.DCOdenom) ||
    !validateAmount(participant.DCOgiveInDenom)
  ) {
    logWarning("Invalid participant data for DCO give", participant);
    return;
  }

  const requestId = uuidv4();
  const dataForDCOgive = {
    memberID: participant.DCOmemberID,
    issuerAccountID: participant.accountID,
    receiverAccountID: foundationID,
    Denomination: participant.DCOdenom,
    InitialAmount: participant.DCOgiveInDenom,
    credexType: DCO_CONSTANTS.TRANSACTION_TYPES.GIVE,
    OFFERSorREQUESTS: "OFFERS" as const,
    securedCredex: DCO_CONSTANTS.RECURRING.SECURED_CREDEX,
    requestId,
    authorizationTemplateID: templateID // Track authorization
  };

  const DCOgiveCredex = await CreateCredexService(dataForDCOgive);
  if (
    typeof DCOgiveCredex.credex === "boolean" ||
    !DCOgiveCredex.credex?.credexID
  ) {
    const error = new DCOError(
      "Invalid response from CreateCredexService for DCO give",
      { participant, templateID }
    );
    logError(error.message, error);
    throw error;
  }

  logInfo("DCO give credex offer created", {
    requestId,
    credexID: DCOgiveCredex.credex.credexID,
    participantID: participant.DCOmemberID,
    action: "OFFER_CREDEX",
    credexData: {
      issuerAccountID: dataForDCOgive.issuerAccountID,
      receiverAccountID: dataForDCOgive.receiverAccountID,
      amount: dataForDCOgive.InitialAmount,
      denomination: dataForDCOgive.Denomination,
      authorizationTemplateID: templateID
    }
  });

  await AcceptCredexService(
    DCOgiveCredex.credex.credexID,
    foundationXOid,
    requestId
  );

  logInfo("DCO give credex accepted", {
    requestId,
    credexID: DCOgiveCredex.credex.credexID,
    participantID: participant.DCOmemberID,
    action: "ACCEPT_CREDEX",
    acceptedBy: foundationXOid
  });
}

/**
 * Processes a single DCO receive transaction
 */
async function processDCOReceiveTransaction(
  participant: Participant,
  foundationID: string,
  foundationXOid: string,
  templateID: string,
  receiveAmount: number
): Promise<void> {
  if (!validateAmount(receiveAmount)) {
    logWarning("Invalid receive amount for DCO receive", {
      receiveAmount,
      participant,
    });
    return;
  }

  const requestId = uuidv4();
  const dataForDCOreceive = {
    memberID: foundationXOid,
    issuerAccountID: foundationID,
    receiverAccountID: participant.accountID,
    Denomination: DCO_CONSTANTS.RECURRING.DEFAULT_DENOMINATION,
    InitialAmount: receiveAmount,
    credexType: DCO_CONSTANTS.TRANSACTION_TYPES.RECEIVE,
    OFFERSorREQUESTS: "OFFERS" as const,
    securedCredex: DCO_CONSTANTS.RECURRING.SECURED_CREDEX,
    requestId,
    authorizationTemplateID: templateID // Track authorization
  };

  const DCOreceiveCredex = await CreateCredexService(dataForDCOreceive);
  if (
    typeof DCOreceiveCredex.credex === "boolean" ||
    !DCOreceiveCredex.credex?.credexID
  ) {
    const error = new DCOError(
      "Invalid response from CreateCredexService for DCO receive",
      { participant, templateID, receiveAmount }
    );
    logError(error.message, error);
    throw error;
  }

  logInfo("DCO receive credex offer created", {
    requestId,
    credexID: DCOreceiveCredex.credex.credexID,
    participantID: participant.DCOmemberID,
    action: "OFFER_CREDEX",
    credexData: {
      issuerAccountID: dataForDCOreceive.issuerAccountID,
      receiverAccountID: dataForDCOreceive.receiverAccountID,
      amount: dataForDCOreceive.InitialAmount,
      denomination: dataForDCOreceive.Denomination,
      authorizationTemplateID: templateID
    }
  });

  await AcceptCredexService(
    DCOreceiveCredex.credex.credexID,
    foundationXOid,
    requestId
  );

  logInfo("DCO receive credex accepted", {
    requestId,
    credexID: DCOreceiveCredex.credex.credexID,
    participantID: participant.DCOmemberID,
    action: "ACCEPT_CREDEX",
    acceptedBy: foundationXOid
  });
}

/**
 * Processes DCO transactions for all confirmed participants using recurring template for authorization
 */
export async function processDCOTransactions(
  session: Session,
  foundationID: string,
  foundationXOid: string,
  participantData: ParticipantData
): Promise<void> {
  logInfo("Processing DCO transactions");

  // Verify DCO authorization
  const templateID = await verifyDCOAuthorization(session, foundationID, foundationXOid);
  logInfo("DCO authorization verified", { templateID });

  const { confirmedParticipants, DCOinCXX, numberConfirmedParticipants } = participantData;

  // Process DCO give transactions
  await Promise.all(
    confirmedParticipants.map(participant =>
      processDCOGiveTransaction(
        participant,
        foundationID,
        foundationXOid,
        templateID
      )
    )
  );

  // Calculate receive amount
  const receiveAmount = DCOinCXX / numberConfirmedParticipants;

  // Process DCO receive transactions
  await Promise.all(
    confirmedParticipants.map(participant =>
      processDCOReceiveTransaction(
        participant,
        foundationID,
        foundationXOid,
        templateID,
        receiveAmount
      )
    )
  );

  logInfo("DCO transactions processed successfully", {
    numberParticipants: numberConfirmedParticipants,
    totalDCOinCXX: DCOinCXX,
    receiveAmountPerParticipant: receiveAmount,
    authorizationTemplateID: templateID
  });
}
