import { random } from "lodash";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function BuyAnchoredCredexesService(
  denom: string,
  number: number,
  lowValue: number,
  highValue: number
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  console.log(`Creating ${denom} anchored credexes: ${number}`);
  if (number > 0) {
    const getAnchoredUSDCounterparties = await ledgerSpaceSession.run(
      `
        // Step 1: Select a random audited account
        MATCH (auditedAccount:Member)<-[:CREDEX_FOUNDATION_AUDITED]-(foundation:Member)
        WITH auditedAccount, rand() AS rand1
        ORDER BY rand1 LIMIT 1

        // Step 2: Collect account IDs for conversion
        MATCH (accounts:Member)
        WHERE accounts.memberID <> auditedAccount.memberID
        WITH auditedAccount, collect(accounts.memberID) AS allaccounts
        RETURN auditedAccount.memberID AS auditedID, allaccounts[0..$numberUSDconversions] AS accountsToConvertUSD
        `,
      {
        numberUSDconversions: neo4j.int(number),
      }
    );

    const issuerMemberID =
      getAnchoredUSDCounterparties.records[0].get("auditedID");
    const accountsToConvertUSD = getAnchoredUSDCounterparties.records[0].get(
      "accountsToConvertUSD"
    );

    const offerPromises = accountsToConvertUSD.map(
      (receiverMemberID: string) => {
        const InitialAmount = random(lowValue, highValue);

        const credexSpecs = {
          issuerMemberID: issuerMemberID,
          receiverMemberID: receiverMemberID,
          Denomination: denom,
          InitialAmount: InitialAmount,
          credexType: "PURCHASE",
          securedCredex: true,
        };

        return OfferCredexService(credexSpecs);
      }
    );

    const offerCredexArray = await Promise.all(offerPromises);

    // Accept offers by processing the results in offerCredexArray
    const acceptPromises = offerCredexArray.map((newcredex) => {
      if (typeof newcredex.credex == "boolean") {
        throw new Error("Invalid response from OfferCredexService");
      }
      if (newcredex.credex && typeof newcredex.credex.credexID === "string") {
        return AcceptCredexService(newcredex.credex.credexID);
      } else {
        return newcredex.message;
      }
    });

    await Promise.all(acceptPromises);
  }
}
