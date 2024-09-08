"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptCredexService = AcceptCredexService;
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
/**
 * AcceptCredexService
 *
 * This service handles the acceptance of a Credex offer.
 * It updates the Credex status from OFFERS to OWES and signs the acceptance.
 *
 * @param credexID - The ID of the Credex to be accepted
 * @param signerID - The ID of the Member or Avatar signing the acceptance
 * @returns An object with the accepted Credex details or null if the operation fails
 * @throws Error if there's an issue with the database operation
 */
async function AcceptCredexService(credexID, signerID) {
  if (!credexID || !signerID) {
    console.error("AcceptCredexService: credexID and signerID are required");
    return null;
  }
  const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH
          (issuer:Account)-[rel1:OFFERS]->
          (acceptedCredex:Credex {credexID: $credexID})-[rel2:OFFERS]->
          (acceptor:Account)<-[:AUTHORIZED_FOR]-
          (signer:Member|Avatar { memberID: $signerID })
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        SET acceptedCredex.acceptedAt = datetime()
        RETURN
          acceptedCredex.credexID AS credexID,
          acceptor.accountID AS acceptorAccountID,
          signer.memberID AS signerID
      `;
      const queryResult = await tx.run(query, { credexID, signerID });
      if (queryResult.records.length === 0) {
        console.warn(
          `No records found or credex no longer pending for credexID: ${credexID}`
        );
        return null;
      }
      const record = queryResult.records[0];
      return {
        acceptedCredexID: record.get("credexID"),
        acceptorAccountID: record.get("acceptorAccountID"),
        acceptorSignerID: record.get("signerID"),
      };
    });
    if (result) {
      console.log(`Offer accepted for credexID: ${result.acceptedCredexID}`);
      // Create digital signature
      await (0, digitalSignature_1.digitallySign)(
        ledgerSpaceSession,
        signerID,
        "Credex",
        result.acceptedCredexID
      );
      // TODO: Implement credex accepted notification here
    }
    return result;
  } catch (error) {
    console.error(`Error accepting credex for credexID ${credexID}:`, error);
    throw new Error(`Failed to accept Credex: ${error.message}`);
  } finally {
    await ledgerSpaceSession.close();
  }
}
//# sourceMappingURL=AcceptCredex.js.map
