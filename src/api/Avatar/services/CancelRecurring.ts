import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

export async function CancelRecurringService(
  signerID: string,
  cancelerAccountID: string,
  avatarID: string,
  requestId: string
) {
  logger.debug("CancelRecurringService entered", {
    signerID,
    cancelerAccountID,
    avatarID,
    requestId,
  });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.info("Executing cancel recurring query", {
      signerID,
      cancelerAccountID,
      avatarID,
      requestId,
    });
    const cancelRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (cancelingAccount:Account { accountID: $cancelerAccountID })-[rel1:ACTIVE|REQUESTS]-
        (recurring:Avatar { memberID: $avatarID})-[rel2:ACTIVE|REQUESTS]-
        (counterparty:Account)
      MATCH
        (cancelingAccount)<-[authRel1:AUTHORIZED_FOR]-
        (recurring)-[authRel2:AUTHORIZED_FOR]->
        (counterparty)
      WITH cancelingAccount, recurring, counterparty, rel1, rel2, authRel1, authRel2
      CALL apoc.create.relationship(cancelingAccount, 'CANCELED', {}, recurring) YIELD rel as canceledRel1
      CALL apoc.create.relationship(recurring, 'CANCELED', {}, counterparty) YIELD rel as canceledRel2
      DELETE rel1, rel2, authRel1, authRel2
      RETURN recurring.memberID AS deactivatedAvatarID
      `,
      {
        signerID,
        cancelerAccountID,
        avatarID,
      }
    );

    if (cancelRecurringQuery.records.length === 0) {
      logger.warn("Recurring template not found or not authorized to cancel", {
        signerID,
        cancelerAccountID,
        avatarID,
        requestId,
      });
      return "Recurring template not found or not authorized to cancel";
    }

    const deactivatedAvatarID = cancelRecurringQuery.records[0].get(
      "deactivatedAvatarID"
    );

    logger.debug("Creating digital signature", {
      signerID,
      cancelerAccountID,
      deactivatedAvatarID,
      requestId,
    });
    const inputData = JSON.stringify({
      signerID,
      cancelerAccountID,
      avatarID: deactivatedAvatarID,
      cancelledAt: new Date().toISOString(),
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Avatar",
      deactivatedAvatarID,
      "CANCEL_RECURRING",
      inputData,
      requestId
    );

    logger.info("Recurring avatar cancelled", {
      deactivatedAvatarID,
      requestId,
    });
    logger.debug("CancelRecurringService exiting successfully", {
      signerID,
      cancelerAccountID,
      avatarID,
      requestId,
    });
    return deactivatedAvatarID;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error cancelling recurring avatar", {
        signerID,
        cancelerAccountID,
        avatarID,
        requestId,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error("Unknown error cancelling recurring avatar", {
        signerID,
        cancelerAccountID,
        avatarID,
        requestId,
        error: String(error),
      });
    }
    logger.debug("CancelRecurringService exiting with error", {
      signerID,
      cancelerAccountID,
      avatarID,
      requestId,
    });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
