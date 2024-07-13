import { ledgerSpaceDriver } from "../config/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import { random } from "lodash";
import moment from "moment-timezone";
import * as neo4j from "neo4j-driver";

export async function CreateTestLoopService(numNewTransactions: number) {
  var ledgerSpaceSession = ledgerSpaceDriver.session();
  const getRandomCounterpartiesQuery = await ledgerSpaceSession.run(
    `
      MATCH (account:Account)
      WITH account, rand() AS rand1
      ORDER BY rand1
      RETURN account.accountID AS accountID LIMIT $numNewTransactions
    `,
    {
      numNewTransactions: neo4j.int(numNewTransactions),
    }
  );

  const getDaynodeDate = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: true})
      RETURN daynode.Date AS today
  `);
  const today = getDaynodeDate.records[0].get("today");

  let credexesCreated = [];
  // Iterate numNewTransactions times
  for (let i = 0; i < numNewTransactions; i++) {
    const issuerAccountID =
      getRandomCounterpartiesQuery.records[i].get("accountID");

    let receiverAccountID;
    if (getRandomCounterpartiesQuery.records[i + 1]) {
      receiverAccountID =
        getRandomCounterpartiesQuery.records[i + 1].get("accountID");
    } else {
      receiverAccountID =
        getRandomCounterpartiesQuery.records[0].get("accountID");
    }

    const credexSpecs = {
      issuerAccountID: issuerAccountID,
      receiverAccountID: receiverAccountID,
      Denomination: "USD",
      InitialAmount: random(1, 100),
      credexType: "PURCHASE",
      //securedCredex: true,
      dueDate: moment(today)
        .utc()
        .add(8, "days")
        .subtract(1, "month")
        .format("YYYY-MM-DD"),
    };

    console.log(
      "Amount: " + credexSpecs.InitialAmount + " " + credexSpecs.Denomination
    );
    const newcredex = await OfferCredexService(credexSpecs);
    if (typeof newcredex.credex == "boolean") {
      throw new Error("Invalid response from OfferCredexService");
    }
    if (newcredex.credex && typeof newcredex.credex.credexID === "string") {
      const credexCreatedData = await AcceptCredexService(
        newcredex.credex.credexID
      );
      credexesCreated.push(credexCreatedData);
    } else {
      return newcredex.message;
    }
  }
  console.log(numNewTransactions + " new transactions created");
  return credexesCreated;
}
