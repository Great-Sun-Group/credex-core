import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
import { LoopFinder } from "./LoopFinder";
import { GetDisplayNameService } from "../../Member/services/GetDisplayNameService";
import _ from "lodash";

export async function MinuteTransactionQueue() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  console.log("MTQ start: check if DCO or MTQ is in progress");
  //and set MTQrunningNow flag to postpone DCO
  const DCOinProgressCheck = await ledgerSpaceSession.run(`
    MATCH (daynode:DayNode {Active: true})
    RETURN
      daynode.DCOrunningNow AS DCOflag,
      daynode.MTQrunningNow AS MTQflag
  `);
  const DCOflag = DCOinProgressCheck.records[0].get("DCOflag");
  const MTQflag = DCOinProgressCheck.records[0].get("MTQflag");

  if (DCOflag || MTQflag) {
    if (DCOflag) {
      console.log("DCO in progress, holding MTQ");
    }
    if (MTQflag) {
      console.log("MTQ in progress, holding MTQ");
    }
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    return;
  }

  console.log("Running MTQ");

  await ledgerSpaceSession.run(`
    MATCH (daynode:DayNode {Active: true})
    SET daynode.MTQrunningNow = true
  `);

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
      const accountForSearchSpace = {
        accountID: record.get("memberID"),
        displayName: GetDisplayNameService({
          memberType: record.get("memberType"),
          firstname: record.get("firstname"),
          lastname: record.get("lastname"),
          companyname: record.get("companyname"),
        }),
      };

      const addAccount = await searchSpaceSession.run(
        `
          CREATE (newAccount:Account)
          SET newAccount = $accountForSearchSpace
          RETURN newAccount.accountID AS accountID
        `,
        { accountForSearchSpace }
      );

      if (addAccount.records.length === 0) {
        console.log(
          "Error creating account in searchSpace: " +
            accountForSearchSpace.displayName
        );
        continue;
      }

      const memberID = addAccount.records[0].get("accountID");

      await ledgerSpaceSession.run(
        `
          MATCH (processedMember:Member {memberID: $memberID})
          SET processedMember.queueStatus = "PROCESSED"
        `,
        { memberID }
      );

      console.log(
        "Account created in searchSpace: " + accountForSearchSpace.displayName
      );
    }

    const getQueuedCredexes = await ledgerSpaceSession.run(`
      MATCH
        (issuerMember:Member)
        -[:OWES]->(queuedCredex:Credex {queueStatus: "PENDING_CREDEX"})
        -[:OWES]->(acceptorMember:Member)
      OPTIONAL MATCH (queuedCredex)<-[:SECURES]-(securer:Member)
      RETURN queuedCredex.acceptedAt AS acceptedAt,
             issuerMember.memberID AS issuerMemberID,
             queuedCredex.credexID AS credexID,
             queuedCredex.InitialAmount AS credexAmount,
             queuedCredex.Denomination AS credexDenomination,
             queuedCredex.CXXmultiplier AS credexCXXmultiplier,
             queuedCredex.CXXmultiplier AS CXXmultiplier,
             securer.memberID AS securerID,
             queuedCredex.dueDate AS credexDueDate,
             acceptorMember.memberID AS acceptorMemberID
    `);

    const sortedQueuedCredexes = _.sortBy(
      getQueuedCredexes.records.map((record) => {
        const credexObject = {
          acceptedAt: record.get("acceptedAt"),
          issuerAccountID: record.get("issuerMemberID"),
          credexID: record.get("credexID"),
          credexAmount: record.get("credexAmount"),
          credexDenomination: record.get("credexDenomination"),
          credexCXXmultiplier: record.get("credexCXXmultiplier"),
          credexSecuredDenom: "floating",
          credexDueDate: record.get("credexDueDate"),
          acceptorAccountID: record.get("acceptorMemberID"),
        };
        // add secured data if appropriate
        if (record.get("securerID") !== null) {
          credexObject.credexSecuredDenom = record.get("credexDenomination");
        }
        return credexObject;
      }),
      "acceptedAt"
    );

    for (const credex of sortedQueuedCredexes) {
      await LoopFinder(
        credex.issuerAccountID,
        credex.credexID,
        credex.credexAmount,
        credex.credexDenomination,
        credex.credexCXXmultiplier,
        credex.credexSecuredDenom,
        credex.credexDueDate,
        credex.acceptorAccountID
      );
    }
  } catch (error) {
    console.error("Error in MinuteTransactionQueue:", error);
  } finally {
    //turn off MTQrunningNow flag
    await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode{MTQrunningNow: true})
      SET daynode.MTQrunningNow = false
    `);

    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    clearTimeout(bailTimer); // Clear bail timer
    console.log("MTQ processing completed");
  }

  return true;
}
