import { v4 as uuidv4 } from "uuid";
import { logInfo, logWarning } from "../../../utils/logger";
import { validateAmount, validateDenomination } from "../../../utils/validators";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { Participant } from "./types";

type OfferRequestType = "OFFERS" | "REQUESTS";

interface CreateCredexData {
  memberID: string;
  issuerAccountID: string;
  receiverAccountID: string;
  Denomination: string;
  InitialAmount: number;
  credexType: string;
  OFFERSorREQUESTS: OfferRequestType;
  securedCredex: boolean;
  requestId: string;
}

/**
 * Processes DCO transactions for all confirmed participants
 */
export async function processDCOTransactions(
  session: any,
  foundationID: string,
  foundationXOid: string,
  DCOinCXX: number,
  numberConfirmedParticipants: number
): Promise<void> {
  logInfo("Processing DCO transactions");

  const confirmedParticipants: Participant[] = (
    await session.run(`
    MATCH (daynode:Daynode{Active:true})
    MATCH (DCOparticipantsDeclared:Account)<-[:OWNS]-(DCOmember:Member)
    WHERE DCOparticipantsDeclared.DCOgiveInCXX > 0
    RETURN
      DCOparticipantsDeclared.accountID AS accountID,
      DCOmember.memberID AS DCOmemberID,
      DCOparticipantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
      DCOparticipantsDeclared.DCOgiveInCXX / daynode[DCOparticipantsDeclared.DCOdenom] AS DCOgiveInDenom,
      DCOparticipantsDeclared.DCOdenom AS DCOdenom
  `)
  ).records.map((record: any) => record.toObject() as Participant);

  // Process DCO give transactions
  await Promise.all(
    confirmedParticipants.map(async (participant: Participant) => {
      if (
        !validateDenomination(participant.DCOdenom) ||
        !validateAmount(participant.DCOgiveInDenom)
      ) {
        logWarning("Invalid participant data for DCO give", participant);
        return;
      }

      const requestId = uuidv4();
      const dataForDCOgive: CreateCredexData = {
        memberID: participant.DCOmemberID,
        issuerAccountID: participant.accountID,
        receiverAccountID: foundationID,
        Denomination: participant.DCOdenom,
        InitialAmount: participant.DCOgiveInDenom,
        credexType: "DCO_GIVE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
        requestId,
      };

      const DCOgiveCredex = await CreateCredexService(dataForDCOgive);
      if (
        typeof DCOgiveCredex.credex === "boolean" ||
        !DCOgiveCredex.credex?.credexID
      ) {
        throw new Error(
          "Invalid response from CreateCredexService for DCO give"
        );
      }

      logInfo("DCO give credex offer created", {
        requestId,
        credexID: DCOgiveCredex.credex.credexID,
        participantID: participant.DCOmemberID,
        action: "OFFER_CREDEX",
        data: JSON.stringify(dataForDCOgive),
      });

      await AcceptCredexService(
        DCOgiveCredex.credex.credexID,
        foundationXOid,
        requestId
      );

      logInfo("DCO give credex accepted", {
        requestId,
        credexID: DCOgiveCredex.credex.credexID,
        participantID: participant.DCOmemberID,
        action: "ACCEPT_CREDEX",
        data: JSON.stringify({ acceptedBy: foundationXOid }),
      });
    })
  );

  // Process DCO receive transactions
  await Promise.all(
    confirmedParticipants.map(async (participant: Participant) => {
      const receiveAmount = DCOinCXX / numberConfirmedParticipants;
      if (!validateAmount(receiveAmount)) {
        logWarning("Invalid receive amount for DCO receive", {
          receiveAmount,
          participant,
        });
        return;
      }

      const requestId = uuidv4();
      const dataForDCOreceive: CreateCredexData = {
        memberID: foundationXOid,
        issuerAccountID: foundationID,
        receiverAccountID: participant.accountID,
        Denomination: "CXX",
        InitialAmount: receiveAmount,
        credexType: "DCO_RECEIVE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
        requestId,
      };

      const DCOreceiveCredex = await CreateCredexService(dataForDCOreceive);
      if (
        typeof DCOreceiveCredex.credex === "boolean" ||
        !DCOreceiveCredex.credex?.credexID
      ) {
        throw new Error(
          "Invalid response from CreateCredexService for DCO receive"
        );
      }

      logInfo("DCO receive credex offer created", {
        requestId,
        credexID: DCOreceiveCredex.credex.credexID,
        participantID: participant.DCOmemberID,
        action: "OFFER_CREDEX",
        data: JSON.stringify(dataForDCOreceive),
      });

      await AcceptCredexService(
        DCOreceiveCredex.credex.credexID,
        foundationXOid,
        requestId
      );

      logInfo("DCO receive credex accepted", {
        requestId,
        credexID: DCOreceiveCredex.credex.credexID,
        participantID: participant.DCOmemberID,
        action: "ACCEPT_CREDEX",
        data: JSON.stringify({ acceptedBy: foundationXOid }),
      });
    })
  );
}
