import { ledgerSpaceDriver } from "../../../config/neo4j";
import { CreateRecurringService } from "./CreateRecurring";

export async function RequestRecurringService(
  signerID: string,
  requestorAccountID: string,
  counterpartyAccountID: string,
  Denomination: string,
  InitialAmount: number,
  firstPayDate: string,
  daysBetweenPays: number,
  remainingPays: number = 0
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const newRecurring = await CreateRecurringService(
      signerID,
      requestorAccountID,
      counterpartyAccountID,
      Denomination,
      InitialAmount,
      "REQUESTS",
      "PURCHASE",
      firstPayDate,
      daysBetweenPays,
      remainingPays
    );

    sendNoti: if (
      typeof newRecurring.recurring != "boolean" &&
      newRecurring.recurring.counterpartyNotiID &&
      newRecurring.recurring.memberID
    ) {
      const signAndGetSendOfferToQuery = await ledgerSpaceSession.run(
        `
        MATCH
          (credex:Credex { credexID: $credexID })<-[:OFFERS]-
          (Account)<-[:AUTHORIZED_FOR]-
          (signer:Member { memberID: $signingMemberID })
        CREATE (credex)<-[:SIGNED]-(signer)
        RETURN signer.memberID AS signerID
        `,
        {
          recipientID: "credexData.receiverAccountID",
          credexID: "newCredex.credex.credexID",
          signingMemberID: "credexData.memberID",
        }
      );

      if (!signAndGetSendOfferToQuery.records.length) {
        console.log("could not get notiPhone");
        break sendNoti;
      }
      //const notiPhone = signAndGetSendOfferToQuery.records[0].get("notiPhone");
      //console.log("sending offer notification to " + notiPhone);
      //hit request noti endpoint
    }

    return newRecurring;
  } catch (error) {
    console.error("Error requesting recurring:", error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}
