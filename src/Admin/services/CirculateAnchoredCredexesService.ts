import { random } from "lodash";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorizationService";
import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function CirculateAnchoredCredexesService(
  denom: string,
  number: number
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  console.log(`Circulating ${denom} anchored credexes: ${number}`);

  try {
    if (number > 0) {
const result = await ledgerSpaceSession.run(
  `
  MATCH
    (issuer:Member)<-[transactionType:OWES]-
    (inCredex:Credex{Denomination:$denom})<-[:SECURES]-(securer:Member)
  OPTIONAL MATCH
    (issuer)-[transactionType:OWES]->
    (outCredex:Credex{Denomination: $denom})<-[:SECURES]-(securer)
  WITH
    issuer,
    sum(inCredex.OutstandingAmount) - sum(outCredex.OutstandingAmount) AS netIn
  WHERE netIn > 0
  WITH
    issuer.memberID AS issuerMemberID
  ORDER BY rand() 
  LIMIT $number
  WITH collect(issuerMemberID) AS issuerMemberIDs
  UNWIND issuerMemberIDs AS issuerMemberID
  MATCH (randomCounterparty:Member)
  WHERE randomCounterparty.memberID <> issuerMemberID
  WITH issuerMemberID, randomCounterparty.memberID AS receiverMemberID
  ORDER BY rand()
  RETURN issuerMemberID, receiverMemberID
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
          const issuerMemberID: string = record.get("issuerMemberID");
          const receiverMemberID: string = record.get("receiverMemberID");

          try {
            const securableData = await GetSecuredAuthorizationService(
              issuerMemberID,
              denom
            );

            const InitialAmount = random(
              1,
              securableData.securableAmountInDenom || 1
            );

            const credexSpecs = {
              issuerMemberID: issuerMemberID,
              receiverMemberID: receiverMemberID,
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
    console.error("Error in CirculateAnchoredCredexesService:", error);
  } finally {
    await ledgerSpaceSession.close();
  }
}
