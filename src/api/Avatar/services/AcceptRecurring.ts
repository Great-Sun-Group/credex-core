import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import { logInfo, logError, logWarning } from "../../../utils/logger";

interface AcceptRecurringParams {
  avatarID: string;
  signerID: string;
  requestId: string; // Add requestId to the params
}

interface AcceptRecurringResult {
  recurring:
    | {
        acceptedRecurringID: string;
        acceptorAccountID: string;
        acceptorSignerID: string;
      }
    | boolean;
  message: string;
}

/**
 * AcceptRecurringService
 *
 * This service handles the acceptance of a recurring transaction.
 * It updates the database to reflect the acceptance of the recurring avatar.
 *
 * @param params - An object containing avatarID, signerID, and requestId
 * @returns An object containing the result of the acceptance operation
 */
export async function AcceptRecurringService(
  params: AcceptRecurringParams
): Promise<AcceptRecurringResult> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const { avatarID, signerID, requestId } = params;

    // Execute Cypher query to validate and update the Recurring avatar
    const acceptRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (acceptor:Account)-[rel1:REQUESTS]->
        (recurring:Avatar { memberID: $avatarID })-[rel2:REQUESTS]->
        (requestor:Account)
      CREATE (acceptor)<-[:AUTHORIZED_FOR]-(recurring)
      CREATE (acceptor)-[:ACTIVE]->(recurring)-[:ACTIVE]->(requestor)
      DELETE rel1, rel2
      RETURN
        recurring.memberID AS avatarID,
        acceptor.accountID AS acceptorAccountID,
        signer.memberID AS signerID
      `,
      { avatarID, signerID }
    );

    // Check if the query returned any records
    if (acceptRecurringQuery.records.length === 0) {
      logInfo(
        `No records found or recurring transaction no longer pending for avatarID: ${avatarID}`,
        { requestId }
      );
      return {
        recurring: false,
        message: `No records found or recurring transaction no longer pending for avatarID: ${avatarID}`,
      };
    }

    // Extract relevant data from the query result
    const record = acceptRecurringQuery.records[0];
    const acceptedRecurringID = record.get("avatarID");
    const acceptorAccountID = record.get("acceptorAccountID");
    const acceptorSignerID = record.get("signerID");

    // Create digital signature
    const inputData = JSON.stringify({
      avatarID: acceptedRecurringID,
      acceptorAccountID,
      acceptorSignerID
    });
    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Avatar",
      acceptedRecurringID,
      "ACCEPT_RECURRING",
      inputData,
      requestId
    );

    // TODO: Implement notification for recurring acceptance

    logInfo(
      `Recurring request accepted for avatarID: ${acceptedRecurringID}`,
      { requestId }
    );

    // Return the result of the acceptance operation
    return {
      recurring: {
        acceptedRecurringID,
        acceptorAccountID,
        acceptorSignerID,
      },
      message: "Recurring template created",
    };
  } catch (error) {
    // Handle any errors that occur during the process
    logError("Error accepting recurring template", error as Error, { requestId: params.requestId });
    return {
      recurring: false,
      message: `Error accepting recurring template: ${error}`,
    };
  } finally {
    // Ensure the database session is closed
    await ledgerSpaceSession.close();
  }
}
