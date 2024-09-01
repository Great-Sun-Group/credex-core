import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function AcceptRecurringService(avatarID: string, signerID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Validate and update the Recurring node
    const acceptRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (acceptor:Account)-[rel1:REQUESTS]->
        (recurring:Avatar { memberID: $avatarID })-[rel2:REQUESTS]->
        (requestor:Account)
      MERGE (signer)-[:SIGNED]->(recurring)
      MERGE (acceptor)-[:ACTIVE]->(recurring)-[:ACTIVE]->(requestor)
      DELETE rel1, rel2
      RETURN
        recurring.memberID AS avatarID,
        acceptor.accountID AS acceptorAccountID,
        signer.memberID AS signerID
      `,
      {
        avatarID,
        signerID,
      }
    );

    if (acceptRecurringQuery.records.length === 0) {
      console.log(
        `No records found or recurring transaction no longer pending for avatarID: ${avatarID}`
      );
      return {
        recurring: false,
        message:
          "No records found or recurring transaction no longer pending for avatarID: " + avatarID,
      };
    }

    //hit credex accepted notification endpoint

    const acceptedRecurringID = acceptRecurringQuery.records[0].get("avatarID");
    const acceptorAccountID =
      acceptRecurringQuery.records[0].get("acceptorAccountID");
    const acceptorSignerID = acceptRecurringQuery.records[0].get("signerID");

    console.log(`Reccuring request accepted for avatarID: ${acceptedRecurringID}`);
    return {
      recurring: {
        acceptedRecurringID: acceptedRecurringID,
        acceptorAccountID: acceptorAccountID,
        acceptorSignerID: acceptorSignerID,
      },
      message: "Recurring template created",
    };

  } catch (error) {
    return {
      recurring: false,
      message: "Error accepting recurring template: " + error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
