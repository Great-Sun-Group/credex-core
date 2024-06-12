import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { Credex } from "../../Credex/types/Credex";
import { random } from "lodash";
import moment from "moment-timezone";
import * as neo4j from "neo4j-driver";

export async function CreateTestLoopService(numNewTransactions: number) {
  var ledgerSpaceSession = ledgerSpaceDriver.session();
  const getRandomCounterpartiesQuery = await ledgerSpaceSession.run(
    `
      MATCH (member:Member)
      WITH member, rand() AS rand1
      ORDER BY rand1
      RETURN member.memberID AS memberID LIMIT $numNewTransactions
    `,
    {
      numNewTransactions: neo4j.int(numNewTransactions),
    }
  );

  let credexesCreated = [];
  // Iterate numNewTransactions times
  for (let i = 0; i < numNewTransactions; i++) {
    const issuerMemberID =
      getRandomCounterpartiesQuery.records[i].get("memberID");

    let receiverMemberID;
    if (getRandomCounterpartiesQuery.records[i + 1]) {
      receiverMemberID =
        getRandomCounterpartiesQuery.records[i + 1].get("memberID");
    } else {
      receiverMemberID =
        getRandomCounterpartiesQuery.records[0].get("memberID");
    }

    const credexSpecs: Credex = {
      issuerMemberID: issuerMemberID,
      receiverMemberID: receiverMemberID,
      Denomination: "USD",
      InitialAmount: random(1, 100),
      credexType: "PURCHASE",
      dueDate: moment().utc().add(7, "days").format("YYYY-MM-DD"),
    };
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
