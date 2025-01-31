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
import { ServiceResult } from "../../../types/apiResponse";
import { DCOCreateCredexResult, DCOCredexData } from "../DCOavatars/types";
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

    this.name = "DCOError";
    this.context = context;
  }

  getContext(): Record<string, unknown> {
    return this.context;
  }
}

/**
 * Type guard to check if result has valid credex data
 */
function hasValidCredexData(
  result: DCOCreateCredexResult
): result is Required<DCOCreateCredexResult> & { data: DCOCredexData } {
  return (
    result.success &&
    result.data !== undefined &&
    "credexID" in result.data &&
    "formattedInitialAmount" in result.data &&
    "counterpartyAccountName" in result.data
  );
}

/**
 * Helper function to safely get error details from a service result
 */
function getErrorDetails(result: ServiceResult<unknown>): {
  message: string;
  details?: string;
} {
  return {
    message: result.message || "Unknown error",
    details: result.error?.details,
  };
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
  const authResult = await session.run(
    `
    MATCH (foundation:Account {accountID: $foundationID})
    WHERE foundation.${DCO_CONSTANTS.AUTHORIZATION.TYPE_PROPERTY} = $authType
    RETURN foundation.${DCO_CONSTANTS.AUTHORIZATION.TEMPLATE_PROPERTY} as templateID
  `,
    {
      foundationID,
      authType: DCO_CONSTANTS.RECURRING.AUTH_TYPE,
    }
  );

  const templateID = authResult.records[0]?.get("templateID");
  if (!templateID) {
    const error = new DCOError("DCO authorization template not found", {
      foundationID,
    });
    logError(error.message, error);
    throw error;
  }

  // Verify template is active
  const templateResult = await GetRecurringService({
    recurringID: templateID,
    accountID: foundationID,
    memberID: foundationXOid,
    requestId: uuidv4(),
  });

  if (!templateResult.success || !templateResult.data) {
    const error = new DCOError("Failed to verify DCO authorization", {
      templateID,
    });
    logError(error.message, error);
    throw error;
  }

  if (
    templateResult.data.scheduleInfo.status !==
    DCO_CONSTANTS.AUTHORIZATION.REQUIRED_STATUS
  ) {
    const error = new DCOError("DCO authorization template not active", {
      templateID,
      status: templateResult.data.scheduleInfo.status,
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
    signerID: participant.recurringID, // Use Recurring node's ID for signing
    issuerAccountID: participant.accountID,
    receiverAccountID: foundationID,
    Denomination: participant.DCOdenom,
    InitialAmount: participant.DCOgiveInDenom,
    credexType: DCO_CONSTANTS.TRANSACTION_TYPES.GIVE,
    OFFERSorREQUESTS: "OFFERS" as const,
    securedCredex: DCO_CONSTANTS.RECURRING.SECURED_CREDEX,
    requestId,
    authorizationTemplateID: templateID, // Track authorization
  };

  const DCOgiveCredex = await CreateCredexService(dataForDCOgive);
  if (!hasValidCredexData(DCOgiveCredex)) {
    const { message, details } = getErrorDetails(DCOgiveCredex);
    const error = new DCOError(
      "Invalid response from CreateCredexService for DCO give",
      {
        participant,
        templateID,
        error: message,
        details,
      }
    );
    logError(error.message, error);
    throw error;
  }

  const credexID = DCOgiveCredex.data.credexID;
  logInfo("DCO give credex offer created", {
    requestId,
    credexID,
    signerID: participant.recurringID, // Log Recurring node's ID
    memberID: participant.DCOmemberID, // Also log member ID for reference
    action: "OFFER_CREDEX",
    credexData: {
      issuerAccountID: dataForDCOgive.issuerAccountID,
      receiverAccountID: dataForDCOgive.receiverAccountID,
      amount: dataForDCOgive.InitialAmount,
      denomination: dataForDCOgive.Denomination,
      authorizationTemplateID: templateID,
    },
  });

  const acceptResult = await AcceptCredexService(
    credexID,
    participant.recurringID, // Use Recurring node's ID for accepting
    requestId
  );

  if (!acceptResult.success || !acceptResult.data) {
    const { message, details } = getErrorDetails(acceptResult);
    const error = new DCOError("Failed to accept DCO give credex", {
      credexID,
      error: message,
      details,
    });
    logError(error.message, error);
    throw error;
  }

  logInfo("DCO give credex accepted", {
    requestId,
    credexID,
    signerID: participant.recurringID, // Log Recurring node's ID
    memberID: participant.DCOmemberID, // Also log member ID for reference
    action: "ACCEPT_CREDEX",
    acceptedBy: participant.recurringID, // Log Recurring node as acceptor
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
    signerID: participant.recurringID, // Use same Recurring node as DCO_GIVE for signing
    issuerAccountID: foundationID,
    receiverAccountID: participant.accountID,
    Denomination: "CXX",
    InitialAmount: 1.0,
    credexType: DCO_CONSTANTS.TRANSACTION_TYPES.RECEIVE,
    OFFERSorREQUESTS: "OFFERS" as const,
    securedCredex: DCO_CONSTANTS.RECURRING.SECURED_CREDEX,
    requestId,
    authorizationTemplateID: templateID, // Track authorization
  };

  const DCOreceiveCredex = await CreateCredexService(dataForDCOreceive);
  if (!hasValidCredexData(DCOreceiveCredex)) {
    const { message, details } = getErrorDetails(DCOreceiveCredex);
    const error = new DCOError(
      "Invalid response from CreateCredexService for DCO receive",
      {
        participant,
        templateID,
        receiveAmount,
        error: message,
        details,
      }
    );
    logError(error.message, error);
    throw error;
  }

  const credexID = DCOreceiveCredex.data.credexID;
  logInfo("DCO receive credex offer created", {
    requestId,
    credexID,
    signerID: participant.recurringID, // Log Recurring node's ID
    memberID: participant.DCOmemberID, // Also log member ID for reference
    action: "OFFER_CREDEX",
    credexData: {
      issuerAccountID: dataForDCOreceive.issuerAccountID,
      receiverAccountID: dataForDCOreceive.receiverAccountID,
      amount: 1.0,
      denomination: "CXX",
      authorizationTemplateID: templateID,
    },
  });

  const acceptResult = await AcceptCredexService(
    credexID,
    participant.recurringID, // Use same Recurring node for accepting
    requestId
  );

  if (!acceptResult.success || !acceptResult.data) {
    const { message, details } = getErrorDetails(acceptResult);
    const error = new DCOError("Failed to accept DCO receive credex", {
      credexID,
      error: message,
      details,
    });
    logError(error.message, error);
    throw error;
  }

  logInfo("DCO receive credex accepted", {
    requestId,
    credexID,
    signerID: participant.recurringID, // Log Recurring node's ID
    memberID: participant.DCOmemberID, // Also log member ID for reference
    action: "ACCEPT_CREDEX",
    acceptedBy: participant.recurringID, // Log Recurring node as acceptor
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
  const templateID = await verifyDCOAuthorization(
    session,
    foundationID,
    foundationXOid
  );
  logInfo("DCO authorization verified", { templateID });

  const { confirmedParticipants, DCOinCXX, numberConfirmedParticipants } =
    participantData;

  // Process DCO give transactions
  await Promise.all(
    confirmedParticipants.map((participant) =>
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
    confirmedParticipants.map((participant) =>
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
    authorizationTemplateID: templateID,
  });
}
