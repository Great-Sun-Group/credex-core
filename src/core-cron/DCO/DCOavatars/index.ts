import { Session } from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AvatarData } from "./types";
import { getActiveRecurringAvatars, deleteMarkedAuthorizations } from "./database";
import {
  prepareOfferData,
  createCredexOffer,
  acceptCredexOffer,
} from "./credexOperations";

/**
 * Processes a single avatar
 */
async function processAvatar(
  session: Session,
  avatarData: AvatarData
): Promise<void> {
  const { avatar, issuerAccountID, acceptorAccountID, date } = avatarData;
  const requestId = uuidv4();
  logger.debug(`Processing avatar ${avatar.memberID}`, {
    requestId,
    avatarId: avatar.memberID,
  });

  try {
    const offerData = prepareOfferData(
      avatar,
      issuerAccountID,
      acceptorAccountID,
      date,
      requestId
    );
    const offerResult = await createCredexOffer(offerData);

    if (offerResult.credex && typeof offerResult.credex === "object") {
      await acceptCredexOffer(
        offerResult.credex.credexID,
        avatar.memberID,
        requestId
      );
      logger.info(
        `Successfully created and accepted credex for recurring avatar`,
        {
          requestId,
          avatarId: avatar.memberID,
          remainingPays: avatar.remainingPays,
          nextPayDate: avatar.nextPayDate,
        }
      );
    } else {
      throw new Error(`Failed to create offer for avatar: ${avatar.memberID}`);
    }

    await deleteMarkedAuthorizations(session, requestId, avatar.memberID);
  } catch (error) {
    logger.error(`Error processing avatar`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      avatarId: avatar.memberID,
    });
    // TODO: Implement member notification about the failure
    logger.warn(
      `Placeholder: Notify member about the failure in processing their recurring avatar`,
      { requestId, avatarId: avatar.memberID }
    );
  }
}

/**
 * DCOavatars function
 * This function is run as a cronjob every 24 hours to process recurring avatars.
 * It identifies active recurring avatars, creates credexes, and updates their status.
 */
export async function DCOavatars(): Promise<void> {
  logger.info("Starting DCOavatars process");
  const ledgerSpaceSession: Session = ledgerSpaceDriver.session();

  try {
    const activeAvatars = await getActiveRecurringAvatars(ledgerSpaceSession);
    logger.info(`Found ${activeAvatars.length} active recurring avatars`);

    for (const avatarData of activeAvatars) {
      await processAvatar(ledgerSpaceSession, avatarData);
    }
  } catch (error) {
    logger.error("Error in DCOavatars", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    logger.debug("Closing ledgerSpace session");
    await ledgerSpaceSession.close();
    logger.info("DCOavatars process completed");
  }
}
