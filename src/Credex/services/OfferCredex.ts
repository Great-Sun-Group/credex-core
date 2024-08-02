import { CreateCredexService } from "./CreateCredex";
import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function OfferCredexService(credexData: any) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    credexData.OFFERSorREQUESTS = "OFFERS";
    if (!credexData.credexType) {
      credexData.credexType = "PURCHASE";
    }
    const newCredex = await CreateCredexService(credexData);

    sendNoti: if (
      typeof newCredex.credex != "boolean" &&
      newCredex.credex.credexID
    ) {
      const signAndGetSendOfferToQuery = await ledgerSpaceSession.run(
        `
        MATCH
          (credex:Credex { credexID: $credexID })-[:OFFERS]->
          (signer:Member { memberID: $signingMemberID })
        CREATE (credex)<-[:MAKE_OFFER_SIGNED]-(signer)
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
      //const notiPhone = signAndGetSendOfferToQuery.records[0].get("notiPhone");
      //console.log("sending offer notification to " + notiPhone);
      //hit offer noti endpoint
    }
    console.log(newCredex.message);

    return newCredex;
  } catch (error) {
    console.error("Error offering credex:", error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
