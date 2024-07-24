import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function AcceptCredexService(credexID: string) {
  if (!credexID) {
    console.log("credexID required");
    return false;
  }
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH
          (member:Member)-[:OWNS]->
          (issuer:Account)-[rel1:OFFERS|REQUESTS]->
          (acceptedCredex:Credex {credexID: $credexID})-[rel2:OFFERS|REQUESTS]->
          (acceptor:Account)
        DELETE rel1, rel2
        CREATE (issuer)-[:OWES]->(acceptedCredex)-[:OWES]->(acceptor)
        SET acceptedCredex.acceptedAt = datetime()
        RETURN
          acceptedCredex.credexID AS credexID,
          acceptor.accountID AS acceptorAccountID,
          member.memberID AS memberID
      `,
      { credexID }
    );

    if (result.records.length === 0) {
      console.log(
        `No records found or credex no longer pending for credexID: ${credexID}`
      );
      return false;
    }

    //hit credex accepted notification endpoint

    const acceptedCredexID = result.records[0].get("credexID");
    const acceptorAccountID = result.records[0].get("acceptorAccountID");
    const memberID = result.records[0].get("memberID");

    console.log(`Offer accepted for credexID: ${acceptedCredexID}`);
    return {
      acceptedCredexID: acceptedCredexID,
      acceptorAccountID: acceptorAccountID,
      memberID: memberID,
    };
  } catch (error) {
    console.error(`Error accepting credex for credexID ${credexID}:`, error);
    throw error; // Optionally rethrow to allow further handling upstream
  } finally {
    await ledgerSpaceSession.close();
  }
}