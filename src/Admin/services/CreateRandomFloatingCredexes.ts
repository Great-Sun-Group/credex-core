import { ledgerSpaceDriver } from "../config/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { Credex } from "../../Credex/types/Credex";
import { random } from "lodash";
import moment from "moment-timezone";

async function getDateAndRandCounterparties() {
  var ledgerSpaceSession = ledgerSpaceDriver.session();
  const getDateAndRandomCounterpartiesQuery = await ledgerSpaceSession.run(`
    MATCH (accounts1:Account)
    WITH accounts1, rand() AS rand1
    ORDER BY rand1
    WITH accounts1.accountID AS accountID_1 LIMIT 1
    MATCH (accounts2:Account)
    WHERE accounts2.accountID <> accountID_1
    WITH accountID_1, accounts2, rand() AS rand2
    ORDER BY rand2
    WITH accountID_1, accounts2.accountID AS accountID_2 LIMIT 1
    MATCH (daynode:DayNode{Active:true})
    RETURN daynode.Date AS date, accountID_1, accountID_2
  `);

  await ledgerSpaceSession.close();

  return {
    accountID_1:
      getDateAndRandomCounterpartiesQuery.records[0].get("accountID_1"),
    accountID_2:
      getDateAndRandomCounterpartiesQuery.records[0].get("accountID_2"),
    date: getDateAndRandomCounterpartiesQuery.records[0].get("date"),
  };
}

export async function CreateRandomFloatingCredexesService(
  numNewTransactions: number
) {
  const credexesCreated = [];
  const batchSize = 3;
  const transactionPromises = [];

  for (let i = 0; i < numNewTransactions; i++) {
    transactionPromises.push(
      (async () => {
        const dateAndCounterparties = await getDateAndRandCounterparties();
        const date = dateAndCounterparties.date;
        const issuerAccountID = dateAndCounterparties.accountID_1;
        const receiverAccountID = dateAndCounterparties.accountID_2;
        const InitialAmount = random(1, 100);
        const Denomination = InitialAmount < 80 ? "USD" : "ZIG";

        // floating credex due in 8-34 days
        const credspanDays = random(8, 34);
        const dueDate = moment(date)
          .subtract(1, "months")
          .add(credspanDays, "days")
          .format("YYYY-MM-DD");

        const credexSpecs: Credex = {
          issuerAccountID: issuerAccountID,
          receiverAccountID: receiverAccountID,
          Denomination: Denomination,
          InitialAmount: InitialAmount,
          credexType: "PURCHASE",
          dueDate: dueDate,
          securedCredex: false,
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

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewTransactions - 1) {
      const batchResults = await Promise.all(transactionPromises);
      credexesCreated.push(
        ...batchResults.filter((result) => result !== undefined)
      );
      transactionPromises.length = 0; // Clear the array for the next batch
    }
  }

  console.log(`${numNewTransactions} new floating transactions created`);
  return credexesCreated;
}
