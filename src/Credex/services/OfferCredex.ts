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
      const getSendOfferToQuery = await ledgerSpaceSession.run(
        `
      MATCH (recipient:Account {accountID: $recipientID})
      OPTIONAL MATCH (recipient)-[:SEND_OFFERS_TO]->(notiAccount:Account)
        RETURN
          CASE
            WHEN notiAccount IS NOT NULL THEN notiAccount.phone
            ELSE recipient.phone
          END AS notiPhone
      `,
        {
          recipientID: credexData.receiverAccountID,
        }
      );

      if (!getSendOfferToQuery.records.length) {
        console.log("could not get notiPhone");
        break sendNoti;
      }
      const notiPhone = getSendOfferToQuery.records[0].get("notiPhone");
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
