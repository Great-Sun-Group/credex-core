import { CreateCredexService } from "./CreateCredex";
import { ledgerSpaceDriver } from "../../../config/neo4j";

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
export async function OfferCredexService(credexData: any) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Set default values for the Credex
    credexData.OFFERSorREQUESTS = "OFFERS";
    if (!credexData.credexType) {
      credexData.credexType = "PURCHASE";
    }
    
    // Create the new Credex
    const newCredex = await CreateCredexService(credexData);

    // Sign the Credex and prepare for notification
    sendNoti: if (
      typeof newCredex.credex != "boolean" &&
      newCredex.credex.credexID
    ) {
      const signAndGetSendOfferToQuery = await ledgerSpaceSession.run(
        `
        MATCH
          (credex:Credex { credexID: $credexID })<-[:OFFERS]-
          (Account)<-[:AUTHORIZED_FOR]-
          (signer:Member|Avatar { memberID: $signingMemberID })
        CREATE (credex)<-[:SIGNED]-(signer)
        RETURN signer.memberID AS signerID
        `,
        {
          recipientID: credexData.receiverAccountID,
          credexID: newCredex.credex.credexID,
          signingMemberID: credexData.memberID,
        }
      );

      if (!signAndGetSendOfferToQuery.records.length) {
        console.log("could not get notiPhone");
        break sendNoti;
      }
      // TODO: Implement offer notification
      // const notiPhone = signAndGetSendOfferToQuery.records[0].get("notiPhone");
      // console.log("sending offer notification to " + notiPhone);
      // hit offer noti endpoint
    }
    console.log(newCredex.message);

    return newCredex;
  } catch (error) {
    console.error("Error offering credex:", error);
    throw error; // Rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
