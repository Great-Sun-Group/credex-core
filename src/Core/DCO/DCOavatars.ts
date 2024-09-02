import { ledgerSpaceDriver } from "../../../config/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import moment from "moment-timezone";

/**
 * DCOavatars function
 * This function is run as a cronjob every 24 hours to process recurring avatars.
 * It identifies active recurring avatars, creates credexes, and updates their status.
 */
export async function DCOavatars() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    console.log("Checking for activated recurring avatars...");
    
    // Query to get active recurring avatars that are due for processing
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
      
      // Reduce remainingPays by 1 if it exists
      SET avatar.remainingPays = 
        CASE
          WHEN avatar.remainingPays IS NOT NULL THEN avatar.remainingPays - 1
          ELSE null
        END
      
      // Calculate the new nextPayDate
      WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2,
           CASE
             WHEN avatar.remainingPays IS NULL OR avatar.remainingPays > 0 
             THEN date(avatar.nextPayDate) + duration({days: avatar.daysBetweenPays})
             ELSE null
           END AS newNextPayDate
      
      // Update nextPayDate
      SET avatar.nextPayDate = newNextPayDate
      
      WITH daynode, issuer, avatar, acceptor, rel1, rel2, authRel1, authRel2, newNextPayDate
      
      // Check if the avatar should be marked as completed
      OPTIONAL MATCH (issuer)-[completed1:COMPLETED]->(avatar)-[completed2:COMPLETED]->(acceptor)
      FOREACH(ignoreMe IN CASE WHEN newNextPayDate IS NULL AND completed1 IS NULL
               THEN [1] ELSE [] END |
        DELETE rel1, rel2
        SET
          authRel1.markedToDelete = true,
          authRel2.markedToDelete = true
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

    // Process each active recurring avatar
    for (const record of GetActiveRecurringAvatars.records) {
      const avatar = record.get("avatar");
      const issuerAccountID = record.get("issuerAccountID");
      const acceptorAccountID = record.get("acceptorAccountID");

      try {
        // Prepare data for creating a new credex
        const offerData: any = {
          memberID: avatar.memberID,
          issuerAccountID: issuerAccountID,
          receiverAccountID: acceptorAccountID,
          Denomination: avatar.Denomination,
          InitialAmount: avatar.InitialAmount,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
        };

        // Handle secured and unsecured credexes differently
        if (avatar.securedCredex) {
          offerData.securedCredex = true;
        } else {
          // Calculate dueDate for unsecured credexes using the avatar's credspan
          avatar.dueDate = moment(record.get("Date"))
            .add(parseInt(avatar.credspan), "days")
            .subtract(parseInt("1"), "month")
            .format("YYYY-MM-DD");
          
          offerData.dueDate = avatar.dueDate;
        }

        // Create a new credex offer
        const offerResult = await OfferCredexService(offerData);

        // If offer is successful, automatically accept it
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
            throw new Error(`Failed to accept credex for avatar: ${avatar.memberID}`);
          }
        } else {
          throw new Error(`Failed to create offer for avatar: ${avatar.memberID}`);
        }

        const deleteAvatarAuths = await ledgerSpaceSession.run(`
          MATCH ()-[rel:AUTHORIZED_FOR {markedToDelete: true}]->()
          DELETE rel
          `);

      } catch (error) {
        console.error(`Error processing avatar ${avatar.memberID}:`, error);
        // TODO: Implement member notification about the failure
        console.log(`Placeholder: Notify member ${avatar.memberID} about the failure in processing their recurring avatar.`);
      }
    }
  } catch (error) {
    console.error("Error in DCOavatars:", error);
  } finally {
    await ledgerSpaceSession.close();
  }
}
