import { CreateCredexService } from "./CreateCredex";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { logInfo, logWarning, logError } from "../../../utils/logger";

interface CredexData {
  memberID: string;
  receiverAccountID: string;
  credexType?: string;
  OFFERSorREQUESTS?: string;
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

    // Sign the Credex and prepare for notification
    const signResult = await signCredex(ledgerSpaceSession, newCredex.credex.credexID, credexData.memberID);
    
    if (!signResult) {
      logWarning("Failed to sign Credex, but Credex was created successfully");
    }

    // TODO: Implement offer notification here

    logInfo(newCredex.message);
    return newCredex;
  } catch (error) {
    logError("Error offering credex", error as Error);
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}

async function signCredex(session: any, credexID: string, signingMemberID: string): Promise<boolean> {
  try {
    const signQuery = await session.run(
      `
      MATCH
        (credex:Credex { credexID: $credexID })<-[:OFFERS]-
        (Account)<-[:AUTHORIZED_FOR]-
        (signer:Member|Avatar { memberID: $signingMemberID })
      CREATE (credex)<-[:SIGNED]-(signer)
      RETURN signer.memberID AS signerID
      `,
      { credexID, signingMemberID }
    );

    return signQuery.records.length > 0;
  } catch (error) {
    logError("Error signing Credex", error as Error);
    return false;
  }
}
