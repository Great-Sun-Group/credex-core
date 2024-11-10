import moment from "moment-timezone";
import logger from "../../../utils/logger";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { Avatar, CredexOfferResult, isCredexObject } from "./types";
import { DCO_CONSTANTS } from "../constants";

interface OfferData {
  memberID: string;
  issuerAccountID: string;
  receiverAccountID: string;
  Denomination: string;
  InitialAmount: number;
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
    memberID: avatar.memberID,
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
    avatarId: avatar.memberID,
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
    avatarId: offerData.memberID,
    credexType: offerData.credexType,
  });
  const offerResult = await CreateCredexService(offerData);

  if (offerResult.credex && isCredexObject(offerResult.credex)) {
    logger.info("Credex offer created", {
      requestId: offerData.requestId,
      credexID: offerResult.credex.credexID,
      avatarID: offerData.memberID,
      credexType: offerData.credexType,
      action: "OFFER_CREDEX",
    });
    return offerResult;
  } else {
    throw new Error(
      `Failed to create credex offer for avatar: ${offerData.memberID}`
    );
  }
}

/**
 * Accepts a credex offer
 */
export async function acceptCredexOffer(
  credexID: string,
  avatarMemberID: string,
  requestId: string
): Promise<void> {
  logger.debug("Accepting credex offer", {
    requestId,
    credexID,
    avatarId: avatarMemberID,
  });
  const acceptResult = await AcceptCredexService(
    credexID,
    avatarMemberID,
    requestId
  );

  if (acceptResult) {
    logger.info("Credex accepted", {
      requestId,
      credexID,
      avatarID: avatarMemberID,
      action: "ACCEPT_CREDEX",
    });
  } else {
    throw new Error(`Failed to accept credex for avatar: ${avatarMemberID}`);
  }
}
