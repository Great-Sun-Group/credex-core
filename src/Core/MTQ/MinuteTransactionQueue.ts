import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { LoopFinder } from "./LoopFinder";
import _ from "lodash";

export async function MinuteTransactionQueue() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  console.log("MTQ start: check if DCO or MTQ is in progress");
  //and set MTQrunningNow flag to postpone DCO
  const DCOinProgressCheck = await ledgerSpaceSession.run(`
    MATCH (daynode:Daynode {Active: true})
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
    MATCH (daynode:Daynode {Active: true})
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
        newAccount.accountName AS accountName,
    `);

    for (const record of getQueuedAccounts.records) {
      const accountForSearchSpace = {
        accountID: record.get("accountID"),
        accountName: record.get("accountName"),
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
            accountForSearchSpace.accountName
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
        "Account created in searchSpace: " + accountForSearchSpace.accountName
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
             acceptorAccount.accountID AS acceptorAccountID,
             securer.accountID AS securerID,
             queuedCredex.credexID AS credexID,
             queuedCredex.InitialAmount AS amount,
             queuedCredex.Denomination AS denomination,
             queuedCredex.CXXmultiplier AS CXXmultiplier,
             queuedCredex.dueDate AS dueDate
    `);

    const sortedQueuedCredexes = _.sortBy(
      getQueuedCredexes.records.map((record) => {
        const credexObject = {
          acceptedAt: record.get("acceptedAt"),
          issuerAccountID: record.get("issuerAccountID"),
          acceptorAccountID: record.get("acceptorAccountID"),
          credexID: record.get("credexID"),
          amount: record.get("amount"),
          denomination: record.get("denomination"),
          CXXmultiplier: record.get("CXXmultiplier"),
          credexSecuredDenom: "floating",
          dueDate: record.get("dueDate"),
        };
        // add secured data if appropriate
        if (record.get("securerID") !== null) {
          credexObject.credexSecuredDenom = record.get("denomination");
        }
        return credexObject;
      }),
      "acceptedAt"
    );

    for (const credex of sortedQueuedCredexes) {
      await LoopFinder(
        credex.issuerAccountID,
        credex.credexID,
        credex.amount,
        credex.denomination,
        credex.CXXmultiplier,
        credex.credexSecuredDenom,
        credex.dueDate,
        credex.acceptorAccountID
      );
    }
  } catch (error) {
    console.error("Error in MinuteTransactionQueue:", error);
  } finally {
    //turn off MTQrunningNow flag
    await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode{MTQrunningNow: true})
      SET daynode.MTQrunningNow = false
    `);

    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    clearTimeout(bailTimer); // Clear bail timer
    console.log("MTQ processing completed");
  }

  return true;
}
