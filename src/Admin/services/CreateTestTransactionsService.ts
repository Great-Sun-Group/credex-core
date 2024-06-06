import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorizationService";
import { random } from "lodash";
import { Credex } from "../../Credex/types/Credex";
var moment = require("moment-timezone");

async function getRandCounterparties() {
  var ledgerSpaceSession = ledgerSpaceDriver.session();
  const getRandomCounterpartiesQuery = await ledgerSpaceSession.run(`
      MATCH (members1:Member)
      WITH members1, rand() AS rand1
      ORDER BY rand1
      WITH members1.memberID AS memberID_1 LIMIT 1
      MATCH (members2:Member)
      WHERE members2.memberID <> memberID_1
      WITH memberID_1, members2, rand() AS rand2
      ORDER BY rand2
      RETURN memberID_1, members2.memberID AS memberID_2 LIMIT 1
    `);

  return {
    memberID_1: getRandomCounterpartiesQuery.records[0].get("memberID_1"),
    memberID_2: getRandomCounterpartiesQuery.records[0].get("memberID_2"),
  };
}

export async function CreateTestTransactionsService(
  numNewTransactions: number
) {
  let credexesCreated = [];

  // Iterate numNewTransactions times
  for (let i = 0; i < numNewTransactions; i++) {
    const counterparties = await getRandCounterparties();
    const issuerMemberID = counterparties.memberID_1;
    const receiverMemberID = counterparties.memberID_2;
    const InitialAmount = random(1, 100);
    const Denomination = "USD";

    //default is unsecured credex due in one week
    let secured = false;
    let dueDate = moment().utc().add(7, "days").format("YYYY-MM-DD");
    //check ability to issue secured credex
    var securedAuthorization = await GetSecuredAuthorizationService(
      issuerMemberID,
      Denomination
    );
    if (securedAuthorization.securableAmountInDenom >= InitialAmount) {
      //if credex of amount can be secured by member, 75% chance credex is secured
      secured = Math.random() < 0.75;
      if (secured) {
        dueDate = "";
      }
    }

    const credexSpecs: Credex = {
      issuerMemberID: issuerMemberID,
      receiverMemberID: receiverMemberID,
      Denomination: Denomination,
      InitialAmount: InitialAmount,
      credexType: "PURCHASE",
      dueDate: dueDate,
      securedCredex: secured,
    };
    const newcredex = await OfferCredexService(credexSpecs);
    if (newcredex.credex) {
      const acceptingID = await AcceptCredexService(newcredex.credex.credexID);

      const credexCreatedData = {
        credexID: acceptingID,
        amount: credexSpecs.InitialAmount,
        denomination: credexSpecs.Denomination,
        secured: secured,
      };
      credexesCreated.push(credexCreatedData);
    } else {
      return newcredex.message;
    }
  }
  console.log(numNewTransactions + " new transactions created");
  return credexesCreated;
}
