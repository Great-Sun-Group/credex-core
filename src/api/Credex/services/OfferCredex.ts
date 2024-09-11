import { CreateCredexService } from "./CreateCredex";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { digitallySign } from "../../../utils/digitalSignature";

interface CredexData {
  memberID: string;
  receiverAccountID: string;
  credexType?: string;
  OFFERSorREQUESTS?: string;
  requestId: string;
  [key: string]: any;
}

/**
 * OfferCredexService
 *
 * This service handles the creation of a new Credex offer.
 * It uses the CreateCredexService to create the Credex and then
 * signs the offer and prepares it for notification.
 *
 * @param credexData - An object containing the data for the new Credex
 * @returns The result of the Credex offer creation
 */
export async function OfferCredexService(credexData: CredexData) {
  logger.debug("Entering OfferCredexService", {
    memberID: credexData.memberID,
    receiverAccountID: credexData.receiverAccountID,
    credexType: credexData.credexType,
    requestId: credexData.requestId,
  });

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Set default values for the Credex
    credexData.OFFERSorREQUESTS = "OFFERS";
    credexData.credexType = credexData.credexType || "PURCHASE";

    // Create the new Credex
    logger.debug("Creating new Credex", {
      memberID: credexData.memberID,
      receiverAccountID: credexData.receiverAccountID,
      credexType: credexData.credexType,
      requestId: credexData.requestId,
    });
    const newCredex = await CreateCredexService(credexData);

    if (typeof newCredex.credex === "boolean" || !newCredex.credex?.credexID) {
      logger.error("Failed to create Credex", {
        memberID: credexData.memberID,
        receiverAccountID: credexData.receiverAccountID,
        credexType: credexData.credexType,
        requestId: credexData.requestId,
      });
      throw new Error("Failed to create Credex");
    }

    // Sign the Credex using the new digital signature utility
    try {
      const inputData = JSON.stringify({
        ...credexData,
        credexID: newCredex.credex.credexID,
        createdAt: new Date().toISOString(),
      });

      logger.debug("Signing Credex", {
        memberID: credexData.memberID,
        credexID: newCredex.credex.credexID,
        requestId: credexData.requestId,
      });
      await digitallySign(
        ledgerSpaceSession,
        credexData.memberID,
        "Credex",
        newCredex.credex.credexID,
        "OFFER_CREDEX",
        inputData,
        credexData.requestId
      );
      logger.info("Credex signed successfully", {
        memberID: credexData.memberID,
        credexID: newCredex.credex.credexID,
        requestId: credexData.requestId,
      });
    } catch (error) {
      logger.warn(
        "Failed to sign Credex, but Credex was created successfully",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          memberID: credexData.memberID,
          credexID: newCredex.credex.credexID,
          requestId: credexData.requestId,
        }
      );
    }

    // TODO: Implement offer notification here

    logger.info(newCredex.message, {
      memberID: credexData.memberID,
      credexID: newCredex.credex.credexID,
      requestId: credexData.requestId,
    });
    return newCredex;
  } catch (error) {
    logger.error("Error offering credex", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberID: credexData.memberID,
      receiverAccountID: credexData.receiverAccountID,
      credexType: credexData.credexType,
      requestId: credexData.requestId,
    });
    throw error;
  } finally {
    logger.debug("Closing database session", {
      requestId: credexData.requestId,
    });
    await ledgerSpaceSession.close();
    logger.debug("Exiting OfferCredexService", {
      memberID: credexData.memberID,
      receiverAccountID: credexData.receiverAccountID,
      credexType: credexData.credexType,
      requestId: credexData.requestId,
    });
  }
}
