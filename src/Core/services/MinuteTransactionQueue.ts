import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
import { LoopFinder } from "./LoopFinder";
import { GetDisplayNameService } from "../../Member/services/GetDisplayNameService";
import { Member } from "../../Member/types/Member";
import _ from "lodash";

export async function MinuteTransactionQueue() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  console.log("Check if DCO is in progress");
  const DCOinProgressCheck = await ledgerSpaceSession.run(`
    MATCH (dayNode:DayNode {Active: true})
    RETURN dayNode.DCOrunningNow AS DCOflag
  `);

  if (DCOinProgressCheck.records[0]?.get("DCOflag")) {
    console.log("DCO in progress, holding loopfinder");
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    return;
  }

  console.log("Running loopfinder");
  const BAIL_TIME = 60 * 1000 * 14; // 14 minutes
  const bailTimer = setTimeout(() => {
    console.log("Bail timer reached");
    return true;
  }, BAIL_TIME);

  try {
    const getQueuedMembers = await ledgerSpaceSession.run(`
      MATCH (newMember:Member {queueStatus: "PENDING_MEMBER"})
      RETURN
        newMember.memberID AS memberID,
        newMember.memberType AS memberType,
        newMember.firstname AS firstname,
        newMember.lastname AS lastname,
        newMember.companyname AS companyname
    `);

    for (const record of getQueuedMembers.records) {
      const queuedMember: Member = {
        memberType: record.get("memberType"),
        firstname: record.get("firstname"),
        lastname: record.get("lastname"),
        companyname: record.get("companyname"),
      };

      const memberForSearchSpace = {
        memberID: record.get("memberID"),
        displayName: GetDisplayNameService(queuedMember),
      };

      const addMember = await searchSpaceSession.run(
        `
          CREATE (newMember:Member)
          SET newMember = $memberForSearchSpace
          RETURN newMember.memberID AS memberID
        `,
        { memberForSearchSpace }
      );

      if (addMember.records.length === 0) {
        console.log(
          "Error creating member in searchSpace: " +
            memberForSearchSpace.displayName
        );
        continue;
      }

      const memberID = addMember.records[0].get("memberID");

      await ledgerSpaceSession.run(
        `
          MATCH (processedMember:Member {memberID: $memberID})
          SET processedMember.queueStatus = "PROCESSED"
        `,
        { memberID }
      );

      console.log(
        "Member created in searchSpace: " + memberForSearchSpace.displayName
      );
    }

    const getQueuedCredexes = await ledgerSpaceSession.run(`
      MATCH (issuerMember:Member)-[:OWES]->(queuedCredex:Credex {queueStatus: "PENDING_CREDEX"})-[:OWES]->(acceptorMember:Member)
      RETURN queuedCredex.acceptedAt AS acceptedAt,
             issuerMember.memberID AS issuerMemberID,
             queuedCredex.credexID AS credexID,
             queuedCredex.InitialAmount AS credexAmount,
             queuedCredex.dueDate AS credexDueDate,
             acceptorMember.memberID AS acceptorMemberID
    `);

    const sortedQueuedCredexes = _.sortBy(getQueuedCredexes.records.map(record => ({
      acceptedAt: record.get("acceptedAt"),
      issuerMemberID: record.get("issuerMemberID"),
      credexID: record.get("credexID"),
      credexAmount: record.get("credexAmount"),
      credexDueDate: record.get("credexDueDate"),
      acceptorMemberID: record.get("acceptorMemberID"),
    })), "acceptedAt");

    for (const credex of sortedQueuedCredexes) {
      await LoopFinder(
        credex.issuerMemberID,
        credex.credexID,
        credex.credexAmount,
        credex.credexDueDate,
        credex.acceptorMemberID
      );
    }
  } catch (error) {
    console.error("Error in MinuteTransactionQueue:", error);
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    clearTimeout(bailTimer); // Clear bail timer
    console.log("Transaction queue processing completed");
  }

  return true;
}
