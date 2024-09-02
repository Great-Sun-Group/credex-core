import { ledgerSpaceDriver } from "../../../config/neo4j";

/**
 * AcceptRecurringService
 * 
 * This service handles the acceptance of a recurring transaction.
 * It updates the database to reflect the acceptance of the recurring avatar.
 * 
 * @param avatarID - The ID of the recurring avatar to be accepted
 * @param signerID - The ID of the member signing (accepting) the recurring transaction
 * @returns An object containing the result of the acceptance operation
 */
export async function AcceptRecurringService(avatarID: string, signerID: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Execute Cypher query to validate and update the Recurring avatar
    const acceptRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (acceptor:Account)-[rel1:REQUESTS]->
        (recurring:Avatar { memberID: $avatarID })-[rel2:REQUESTS]->
        (requestor:Account)
      CREATE (signer)-[:SIGNED]->(recurring)
      CREATE (acceptor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (acceptor)-[:ACTIVE]->(recurring)-[:ACTIVE]->(requestor)
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

    // Check if the query returned any records
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

    // TODO: Implement notification for credex acceptance

    // Extract relevant data from the query result
    const acceptedRecurringID = acceptRecurringQuery.records[0].get("avatarID");
    const acceptorAccountID =
      acceptRecurringQuery.records[0].get("acceptorAccountID");
    const acceptorSignerID = acceptRecurringQuery.records[0].get("signerID");

    console.log(`Recurring request accepted for avatarID: ${acceptedRecurringID}`);
    
    // Return the result of the acceptance operation
    return {
      recurring: {
        acceptedRecurringID: acceptedRecurringID,
        acceptorAccountID: acceptorAccountID,
        acceptorSignerID: acceptorSignerID,
      },
      message: "Recurring template created",
    };

  } catch (error) {
    // Handle any errors that occur during the process
    return {
      recurring: false,
      message: "Error accepting recurring template: " + error,
    };
  } finally {
    // Ensure the database session is closed
    await ledgerSpaceSession.close();
  }
}
