import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../../config/logger";

interface AcceptRecurringParams {
  avatarID: string;
  signerID: string;
  requestId: string;
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
  const { avatarID, signerID, requestId } = params;
  logger.debug('AcceptRecurringService entered', { avatarID, signerID, requestId });

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.info('Executing accept recurring query', { avatarID, signerID, requestId });
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

    if (acceptRecurringQuery.records.length === 0) {
      logger.warn('No records found or recurring transaction no longer pending', { avatarID, requestId });
      return {
        recurring: false,
        message: `No records found or recurring transaction no longer pending for avatarID: ${avatarID}`,
      };
    }

    const record = acceptRecurringQuery.records[0];
    const acceptedRecurringID = record.get("avatarID");
    const acceptorAccountID = record.get("acceptorAccountID");
    const acceptorSignerID = record.get("signerID");

    logger.debug('Creating digital signature', { acceptedRecurringID, acceptorAccountID, acceptorSignerID, requestId });
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

    logger.info('Recurring request accepted', { acceptedRecurringID, requestId });
    logger.debug('AcceptRecurringService exiting successfully', { avatarID, signerID, requestId });

    return {
      recurring: {
        acceptedRecurringID,
        acceptorAccountID,
        acceptorSignerID,
      },
      message: "Recurring template created",
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error accepting recurring template', { 
        avatarID, 
        signerID, 
        requestId, 
        error: error.message, 
        stack: error.stack 
      });
    } else {
      logger.error('Unknown error accepting recurring template', { 
        avatarID, 
        signerID, 
        requestId, 
        error: String(error)
      });
    }
    logger.debug('AcceptRecurringService exiting with error', { avatarID, signerID, requestId });
    return {
      recurring: false,
      message: `Error accepting recurring template: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
