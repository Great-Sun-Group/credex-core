import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { LoopFinder } from "./LoopFinder";
import { GetDisplayNameService } from "../../Account/services/GetDisplayNameService";
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
    const getQueuedAccounts = await ledgerSpaceSession.run(`
      MATCH (newAccount:Account {queueStatus: "PENDING_MEMBER"})
      RETURN
        newAccount.accountID AS accountID,
        newAccount.accountType AS accountType,
        newAccount.firstname AS firstname,
        newAccount.lastname AS lastname,
        newAccount.companyname AS companyname
    `);

    for (const record of getQueuedAccounts.records) {
      const accountForSearchSpace = {
        accountID: record.get("accountID"),
        displayName: GetDisplayNameService({
          accountType: record.get("accountType"),
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

      const accountID = addAccount.records[0].get("accountID");

      await ledgerSpaceSession.run(
        `
          MATCH (processedAccount:Account {accountID: $accountID})
          SET processedAccount.queueStatus = "PROCESSED"
        `,
        { accountID }
      );

      console.log(
        "Account created in searchSpace: " + accountForSearchSpace.displayName
      );
    }

    const getQueuedCredexes = await ledgerSpaceSession.run(`
      MATCH
        (issuerAccount:Account)
        -[:OWES]->(queuedCredex:Credex {queueStatus: "PENDING_CREDEX"})
        -[:OWES]->(acceptorAccount:Account)
      OPTIONAL MATCH (queuedCredex)<-[:SECURES]-(securer:Account)
      RETURN queuedCredex.acceptedAt AS acceptedAt,
             issuerAccount.accountID AS issuerAccountID,
             queuedCredex.credexID AS credexID,
             queuedCredex.InitialAmount AS credexAmount,
             queuedCredex.Denomination AS credexDenomination,
             queuedCredex.CXXmultiplier AS credexCXXmultiplier,
             queuedCredex.CXXmultiplier AS CXXmultiplier,
             securer.accountID AS securerID,
             queuedCredex.dueDate AS credexDueDate,
             acceptorAccount.accountID AS acceptorAccountID
    `);

    const sortedQueuedCredexes = _.sortBy(
      getQueuedCredexes.records.map((record) => {
        const credexObject = {
          acceptedAt: record.get("acceptedAt"),
          issuerAccountID: record.get("issuerAccountID"),
          credexID: record.get("credexID"),
          credexAmount: record.get("credexAmount"),
          credexDenomination: record.get("credexDenomination"),
          credexCXXmultiplier: record.get("credexCXXmultiplier"),
          credexSecuredDenom: "floating",
          credexDueDate: record.get("credexDueDate"),
          acceptorAccountID: record.get("acceptorAccountID"),
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
