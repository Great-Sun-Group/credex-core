import moment from "moment-timezone";
import logger from "../../../utils/logger";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { Avatar, CredexOfferResult, isCredexObject } from "./types";
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
export async function createCredexOffer(offerData: OfferData): Promise<CredexOfferResult> {
  logger.debug("Creating new credex offer", {
    requestId: offerData.requestId,
    signerID: offerData.signerID,
    credexType: offerData.credexType,
  });
  const offerResult = await CreateCredexService(offerData);

  if (offerResult.credex && isCredexObject(offerResult.credex)) {
    logger.info("Credex offer created", {
      requestId: offerData.requestId,
      credexID: offerResult.credex.credexID,
      signerID: offerData.signerID,
      credexType: offerData.credexType,
      action: "OFFER_CREDEX",
    });
    return offerResult;
  } else {
    throw new Error(
      `Failed to create credex offer for signer: ${offerData.signerID}`
    );
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

  if (acceptResult) {
    logger.info("Credex accepted", {
      requestId,
      credexID,
      signerID,
      action: "ACCEPT_CREDEX",
    });
  } else {
    throw new Error(`Failed to accept credex for signer: ${signerID}`);
  }
}
