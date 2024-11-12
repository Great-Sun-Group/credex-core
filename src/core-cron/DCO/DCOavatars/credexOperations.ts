import moment from "moment-timezone";
import logger from "../../../utils/logger";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { ServiceResult } from "../../../types/apiResponse";
import { 
  Avatar, 
  DCOCreateCredexResult,
  DCOCredexData
} from "./types";
import { DCO_CONSTANTS } from "../constants";

// Match CreateCredexInput interface exactly
interface OfferData {
  signerID: string;  // Use signerID to match CreateCredexInput
  issuerAccountID: string;
  receiverAccountID: string;
  InitialAmount: number;
  Denomination: string;
  credexType: string;
  OFFERSorREQUESTS: "OFFERS";
  requestId: string;
  securedCredex: boolean;
  dueDate?: string;
}

interface AcceptCredexData {
  credexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
  acceptedAt: string;
  transactionType: string;
  amount: string;
  denomination: string;
  secured: boolean;
}

type AcceptCredexResult = ServiceResult<AcceptCredexData>;

/**
 * Type guard to check if result has valid credex data
 */
function hasValidCredexData(result: DCOCreateCredexResult): result is DCOCreateCredexResult & { data: DCOCredexData } {
  return (
    result.success &&
    result.data !== undefined &&
    'credexID' in result.data &&
    'formattedInitialAmount' in result.data &&
    'counterpartyAccountName' in result.data
  );
}

/**
 * Prepares the data needed for creating a credex offer
 */
export function prepareOfferData(
  avatar: Avatar,
  issuerAccountID: string,
  acceptorAccountID: string,
  date: string,
  requestId: string
): OfferData {
  const offerData: OfferData = {
    signerID: avatar.signerID,  // Pass through the signer's ID
    issuerAccountID: issuerAccountID,
    receiverAccountID: acceptorAccountID,
    Denomination: avatar.Denomination,
    InitialAmount: avatar.InitialAmount,
    // Set credexType based on template type
    credexType: avatar.templateType === "DCO_GIVE" 
      ? DCO_CONSTANTS.TRANSACTION_TYPES.GIVE 
      : "PURCHASE",
    OFFERSorREQUESTS: "OFFERS",
    requestId,
    // DCO_GIVE templates must be secured
    securedCredex: avatar.templateType === "DCO_GIVE" ? true : avatar.securedCredex,
  };

  // Only set dueDate for non-secured credexes
  if (!offerData.securedCredex) {
    offerData.dueDate = moment(date)
      .add(parseInt(avatar.credspan), "days")
      .subtract(1, "month")
      .format("YYYY-MM-DD");
  }

  logger.debug("Prepared credex offer data", {
    requestId,
    signerID: avatar.signerID,
    templateType: avatar.templateType,
    offerData,
  });
  return offerData;
}

/**
 * Creates a new credex offer
 */
export async function createCredexOffer(offerData: OfferData): Promise<DCOCreateCredexResult> {
  logger.debug("Creating new credex offer", {
    requestId: offerData.requestId,
    signerID: offerData.signerID,
    credexType: offerData.credexType,
  });

  const offerResult = await CreateCredexService(offerData);

  if (hasValidCredexData(offerResult)) {
    logger.info("Credex offer created", {
      requestId: offerData.requestId,
      credexID: offerResult.data.credexID,
      signerID: offerData.signerID,
      credexType: offerData.credexType,
      action: "OFFER_CREDEX",
    });
    return {
      success: true,
      data: offerResult.data,
      message: offerResult.message
    };
  } else {
    const errorMessage = offerResult.message || "Unknown error creating credex offer";
    const errorDetails = offerResult.error?.details;

    logger.error("Failed to create credex offer", {
      requestId: offerData.requestId,
      signerID: offerData.signerID,
      error: errorMessage,
      details: errorDetails
    });

    return {
      success: false,
      message: errorMessage,
      error: {
        code: "CREATE_FAILED",
        details: errorDetails
      }
    };
  }
}

/**
 * Accepts a credex offer
 */
export async function acceptCredexOffer(
  credexID: string,
  signerID: string,
  requestId: string
): Promise<void> {
  logger.debug("Accepting credex offer", {
    requestId,
    credexID,
    signerID,
  });

  const acceptResult = await AcceptCredexService(
    credexID,
    signerID,
    requestId
  );

  if (acceptResult.success && acceptResult.data) {
    logger.info("Credex accepted", {
      requestId,
      credexID,
      signerID,
      action: "ACCEPT_CREDEX",
    });
  } else {
    const errorMessage = acceptResult.message || "Unknown error accepting credex";
    const errorDetails = acceptResult.error?.details;

    logger.error("Failed to accept credex", {
      requestId,
      credexID,
      signerID,
      error: errorMessage,
      details: errorDetails
    });

    throw new Error(
      `Failed to accept credex for signer: ${signerID} - ${errorMessage}`
    );
  }
}
