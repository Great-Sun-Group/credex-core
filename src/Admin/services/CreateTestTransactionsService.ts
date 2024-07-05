import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorizationService";
import { Credex } from "../../Credex/types/Credex";
import { random } from "lodash";
import moment from "moment-timezone";

async function getDateAndRandCounterparties() {
  var ledgerSpaceSession = ledgerSpaceDriver.session();
  const getDateAndRandomCounterpartiesQuery = await ledgerSpaceSession.run(`
    MATCH (members1:Member)
    WITH members1, rand() AS rand1
    ORDER BY rand1
    WITH members1.memberID AS memberID_1 LIMIT 1
    MATCH (members2:Member)
    WHERE members2.memberID <> memberID_1
    WITH memberID_1, members2, rand() AS rand2
    ORDER BY rand2
    WITH memberID_1, members2.memberID AS memberID_2 LIMIT 1
    MATCH (daynode:DayNode{Active:true})
    RETURN daynode.Date AS date, memberID_1, memberID_2
  `);

  await ledgerSpaceSession.close();

  return {
    memberID_1:
      getDateAndRandomCounterpartiesQuery.records[0].get("memberID_1"),
    memberID_2:
      getDateAndRandomCounterpartiesQuery.records[0].get("memberID_2"),
    date: getDateAndRandomCounterpartiesQuery.records[0].get("date"),
  };
}

export async function CreateTestTransactionsService(numNewTransactions: number) {
  let credexesCreated = [];

  const transactionPromises = [];

  for (let i = 0; i < numNewTransactions; i++) {
    transactionPromises.push(
      (async () => {
        const dateAndCounterparties = await getDateAndRandCounterparties();
        const date = dateAndCounterparties.date;
        const issuerMemberID = dateAndCounterparties.memberID_1;
        const receiverMemberID = dateAndCounterparties.memberID_2;
        const InitialAmount = random(1, 100);
        let Denomination = InitialAmount < 70 ? "USD" : "ZIG";

        // default is unsecured credex due in 3 weeks
        let secured = false;
        let dueDate = moment(date)
          .subtract(1, "months")
          .add(21, "days")
          .format("YYYY-MM-DD");

        // check ability to issue secured credex
        const securedAuthorization = await GetSecuredAuthorizationService(
          issuerMemberID,
          Denomination
        );
        if (securedAuthorization.securableAmountInDenom >= InitialAmount) {
          // if credex of amount can be secured by member, 75% chance credex is secured
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
        if (typeof newcredex.credex == "boolean") {
          throw new Error("Invalid response from OfferCredexService");
        }
        if (newcredex.credex && typeof newcredex.credex.credexID === "string") {
          const credexCreatedData = await AcceptCredexService(
            newcredex.credex.credexID
          );
          return credexCreatedData;
        } else {
          return newcredex.message;
        }
      })()
    );
  }

  const credexesCreatedArray = await Promise.all(transactionPromises);
  credexesCreated.push(
    ...credexesCreatedArray.filter((result) => result !== undefined)
  );

  console.log(`${numNewTransactions} new transactions created`);
  return credexesCreated;
}
