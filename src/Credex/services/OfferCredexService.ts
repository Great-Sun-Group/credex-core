/*
creates a credex as an offer
requires all data for CreateCredexService
adds fields to indicate credex is an offer and a purchase
returns data passed out from CreateCredexService
*/

import { CreateCredexService } from "./CreateCredexService";
import { Credex } from "../types/Credex";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function OfferCredexService(credexData: Credex) {
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
      MATCH (recipient:Member {memberID: $recipientID})
      OPTIONAL MATCH (recipient)-[:SEND_OFFERS_TO]->(notiMember:Member)
        RETURN
          CASE
            WHEN notiMember IS NOT NULL THEN notiMember.phone
            ELSE recipient.phone
          END AS notiPhone
      `,
        {
          recipientID: credexData.receiverMemberID,
        }
      );

      if (!getSendOfferToQuery.records.length) {
        console.log("could not get notiPhone");
        break sendNoti;
      }
      const notiPhone = getSendOfferToQuery.records[0].get("notiPhone")
      console.log("sending offer notification to " + notiPhone)
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
