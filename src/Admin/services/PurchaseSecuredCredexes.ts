import { random } from "lodash";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function PurchaseSecuredCredexesService(
  denom: string,
  number: number,
  lowValue: number,
  highValue: number
) {
  /*
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  console.log(`Purchasing ${denom} secured credexes: ${number}`);

  if (number > 0) {
    const getSecuredUSDCounterparties = await ledgerSpaceSession.run(
      `
        // Step 1: Select a random audited account
        MATCH (auditedAccount:Account)<-[:CREDEX_FOUNDATION_AUDITED]-(foundation:Account)
        WITH auditedAccount, rand() AS rand
        ORDER BY rand LIMIT 1

        // Step 2: Collect account IDs for purchasers
        MATCH (accounts:Account)
        WHERE accounts.accountID <> auditedAccount.accountID
        WITH auditedAccount, collect(accounts.accountID) AS allaccounts
        RETURN auditedAccount.accountID AS auditedID, allaccounts[0..$number] AS accountsToPurchaseUSDsecured
      `,
      {
        number: neo4j.int(number),
      }
    );

    const issuerAccountID =
      getSecuredUSDCounterparties.records[0].get("auditedID");
    const accountsToPurchaseUSDsecured =
      getSecuredUSDCounterparties.records[0].get(
        "accountsToPurchaseUSDsecured"
      );

    const batchSize = 3;

    for (let i = 0; i < accountsToPurchaseUSDsecured.length; i += batchSize) {
      const batch = accountsToPurchaseUSDsecured.slice(i, i + batchSize);

      const offerPromises = batch.map((receiverAccountID: string) => {
        const InitialAmount = random(lowValue, highValue);

        const credexSpecs = {
          issuerAccountID: issuerAccountID,
          receiverAccountID: receiverAccountID,
          Denomination: denom,
          InitialAmount: InitialAmount,
          credexType: "PURCHASE",
          securedCredex: true,
        };

        return OfferCredexService(credexSpecs);
      });

      const offerCredexArray = await Promise.all(offerPromises);

      const acceptPromises = offerCredexArray.map((newcredex) => {
        if (typeof newcredex.credex == "boolean") {
          throw new Error("Invalid response from OfferCredexService");
        }
        if (newcredex.credex && typeof newcredex.credex.credexID === "string") {
          return AcceptCredexService(newcredex.credex.credexID);
        } else {
          return Promise.reject(newcredex.message);
        }
      });

      await Promise.all(acceptPromises);
    }
  }

  await ledgerSpaceSession.close();
  */
}
