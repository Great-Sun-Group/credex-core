"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTestLoopService = CreateTestLoopService;
async function CreateTestLoopService(numNewTransactions) {
    /*
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
        MATCH (daynode:Daynode {Active: true})
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
    */
}
//# sourceMappingURL=CreateTestLoop.js.map