import { CreateCredexService } from "./CreateCredex";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { logInfo, logWarning, logError } from "../../../utils/logger";
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
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Set default values for the Credex
    credexData.OFFERSorREQUESTS = "OFFERS";
    credexData.credexType = credexData.credexType || "PURCHASE";

    // Create the new Credex
    const newCredex = await CreateCredexService(credexData);

    if (typeof newCredex.credex === "boolean" || !newCredex.credex?.credexID) {
      throw new Error("Failed to create Credex");
    }

    // Sign the Credex using the new digital signature utility
    try {
      const inputData = JSON.stringify({
        ...credexData,
        credexID: newCredex.credex.credexID,
        createdAt: new Date().toISOString()
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
      logInfo(`Credex signed successfully. Request ID: ${credexData.requestId}`);
    } catch (error) {
      logWarning(
        "Failed to sign Credex, but Credex was created successfully",
        { error, requestId: credexData.requestId }
      );
    }

    // TODO: Implement offer notification here

    logInfo(newCredex.message, { requestId: credexData.requestId });
    return newCredex;
  } catch (error) {
    logError("Error offering credex", error as Error, { requestId: credexData.requestId });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
