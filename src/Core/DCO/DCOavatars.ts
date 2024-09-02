import { ledgerSpaceDriver } from "../../../config/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import moment from "moment-timezone";

export async function DCOavatars() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    console.log("Check for activated recurring avatars...");
    const GetActiveRecurringAvatars = await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode {Active: true})
      MATCH
        (issuer:Account)-[rel1:ACTIVE]->
        (avatar:Avatar { avatarType: "RECURRING", nextPayDate: daynode.Date})-[rel2:ACTIVE]->
        (acceptor:Account)
      MATCH
        (issuer)<-[authRel1:AUTHORIZED_FOR]-
        (avatar)-[authRel2:AUTHORIZED_FOR]->
        (counterparty)
      WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2
      SET avatar.remainingPays = avatar.remainingPays - 1
      WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2,
           CASE
             WHEN avatar.remainingPays > 0 THEN date(avatar.nextPayDate) + duration({days: avatar.daysBetweenPays})
             ELSE null
           END AS newNextPayDate
      SET avatar.nextPayDate = newNextPayDate
      WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2, newNextPayDate
      OPTIONAL MATCH (issuer)-[completed1:COMPLETED]->(avatar)-[completed2:COMPLETED]->(acceptor)
      FOREACH(ignoreMe IN CASE WHEN newNextPayDate IS NULL AND completed1 IS NULL
               THEN [1] ELSE [] END |
        DELETE rel1, rel2, authRel1, authRel2
        CREATE (issuer)-[:COMPLETED]->(avatar)-[:COMPLETED]->(acceptor)
      )
      RETURN
        avatar {
          .*,
          remainingPays: avatar.remainingPays,
          nextPayDate: avatar.nextPayDate
        } AS avatar,
        issuer.accountID AS issuerAccountID,
        acceptor.accountID AS acceptorAccountID,
        daynode.Date AS Date    
    `);

    for (const record of GetActiveRecurringAvatars.records) {
      const avatar = record.get("avatar");
      const issuerAccountID = record.get("issuerAccountID");
      const acceptorAccountID = record.get("acceptorAccountID");

      const offerData: any = {
        memberID: avatar.memberID,
        issuerAccountID: issuerAccountID,
        receiverAccountID: acceptorAccountID,
        Denomination: avatar.Denomination,
        InitialAmount: avatar.InitialAmount,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
      };
      if (avatar.secured) {
        offerData.securedCredex = avatar.securedCredex;
      } else {
        avatar.dueDate = moment(record.get("Date"))
          .subtract(1, "month")
          .add(7, "days")
          .format("YYYY-MM-DD");
        
        offerData.dueDate = avatar.dueDate;
      }

      // Call the OfferCredex service with the data returned
      const offerResult = await OfferCredexService(offerData);

      // Check if offer is made successfully, if so then call the AcceptCredex service
      if (
        offerResult &&
        typeof offerResult.credex === "object" &&
        offerResult.credex.credexID
      ) {
        const acceptResult = await AcceptCredexService(
          offerResult.credex.credexID,
          avatar.memberID
        );
        if (acceptResult) {
          console.log(
            `Successfully created credex for recurring avatar: ${avatar.memberID}. Remaining pays: ${avatar.remainingPays}, Next pay date: ${avatar.nextPayDate}`
          );
        } else {
          console.error(
            `Failed to accept credex for avatar: ${avatar.memberID}`
          );
        }
      } else {
        console.error(`Failed to create offer for avatar: ${avatar.memberID}`);
      }
    }
  } catch (error) {
    console.error("Error in DCOavatars:", error);
  } finally {
    await ledgerSpaceSession.close();
  }
}
