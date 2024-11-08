import { random } from "lodash";
import { OfferCredexService } from "../../../src/api/Credex/services/OfferCredex";
import { AcceptCredexService } from "../../../src/api/Credex/services/AcceptCredex";
import { GetSecuredAuthorizationService } from "../../../src/api/Credex/services/GetSecuredAuthorization";
import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function InEcosystemSecuredCredexesService(
  denom: string,
  number: number
) {
  /*
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  console.log(`Creating in-ecosystem ${denom} secured credexes: ${number}`);

  try {
    if (number > 0) {
      const result = await ledgerSpaceSession.run(
        `
        MATCH
          (issuer:Account)<-[transactionType:OWES]-
          (inCredex:Credex{Denomination:$denom})<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH
          (issuer)-[transactionType:OWES]->
          (outCredex:Credex{Denomination: $denom})<-[:SECURES]-(securer)
        WITH
          issuer,
          sum(inCredex.OutstandingAmount) - sum(outCredex.OutstandingAmount) AS netIn
        WHERE netIn > 0
        WITH
          issuer.accountID AS issuerAccountID
        ORDER BY rand() 
        LIMIT $number
        WITH collect(issuerAccountID) AS issuerAccountIDs
        UNWIND issuerAccountIDs AS issuerAccountID
        MATCH (randomCounterparty:Account)
        WHERE randomCounterparty.accountID <> issuerAccountID
        WITH issuerAccountID, randomCounterparty.accountID AS receiverAccountID
        ORDER BY rand()
        RETURN issuerAccountID, receiverAccountID
        LIMIT $number
        `,
        {
          number: neo4j.int(number),
          denom,
        }
      );

      if (result.records.length === 0) {
        console.log("No records found for circulation.");
        return;
      }

      const batchSize = 3;
      const records = result.records;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const offerPromises = batch.map(async (record) => {
          const issuerAccountID: string = record.get("issuerAccountID");
          const receiverAccountID: string = record.get("receiverAccountID");

          try {
            const securableData = await GetSecuredAuthorizationService(
              issuerAccountID,
              denom
            );

            const maxSecurable = securableData.securableAmountInDenom;
            let InitialAmount;
            if (maxSecurable >= 1) {
              InitialAmount = random(maxSecurable);
            } else {
              InitialAmount = random(0.1, maxSecurable);
            }
            console.log("random initialAmount: " + InitialAmount);

            const credexSpecs = {
              issuerAccountID: issuerAccountID,
              receiverAccountID: receiverAccountID,
              Denomination: denom,
              InitialAmount: InitialAmount,
              credexType: "PURCHASE",
              securedCredex: true,
            };

            const newcredex = await OfferCredexService(credexSpecs);

            if (
              typeof newcredex.credex === "boolean" ||
              !newcredex.credex?.credexID
            ) {
              throw new Error("Invalid response from OfferCredexService");
            }

            await AcceptCredexService(newcredex.credex.credexID);
          } catch (error) {
            console.error("Error processing credex offer:", error);
            // Handle error as needed
          }
        });

        await Promise.all(offerPromises);
      }
    }
  } catch (error) {
    console.error("Error in InEcosystemSecuredCredexesService:", error);
  } finally {
    await ledgerSpaceSession.close();
  }
*/
}
