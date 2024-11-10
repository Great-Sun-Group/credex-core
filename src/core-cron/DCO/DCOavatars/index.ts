import { Session } from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AvatarData } from "./types";
import { 
  getActiveRecurringAvatars, 
  getActiveDCOGiveTemplates,
  deleteMarkedAuthorizations 
} from "./database";
import {
  prepareOfferData,
  createCredexOffer,
  acceptCredexOffer,
} from "./credexOperations";

/**
 * Processes a single avatar/template
 */
async function processAvatar(
  session: Session,
  avatarData: AvatarData,
  isDCOGive: boolean = false
): Promise<void> {
  const { avatar, issuerAccountID, acceptorAccountID, date } = avatarData;
  const requestId = uuidv4();
  logger.debug(`Processing ${isDCOGive ? 'DCO_GIVE template' : 'avatar'} ${avatar.memberID}`, {
    requestId,
    avatarId: avatar.memberID,
    type: isDCOGive ? 'DCO_GIVE' : 'REGULAR'
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
      // For DCO_GIVE templates, the foundation auto-accepts
      await acceptCredexOffer(
        offerResult.credex.credexID,
        isDCOGive ? acceptorAccountID : avatar.memberID,
        requestId
      );
      logger.info(
        `Successfully created and accepted credex for ${isDCOGive ? 'DCO_GIVE template' : 'recurring avatar'}`,
        {
          requestId,
          avatarId: avatar.memberID,
          type: isDCOGive ? 'DCO_GIVE' : 'REGULAR',
          remainingPays: avatar.remainingPays,
          nextPayDate: avatar.nextPayDate,
        }
      );
    } else {
      throw new Error(`Failed to create offer for ${isDCOGive ? 'DCO_GIVE template' : 'avatar'}: ${avatar.memberID}`);
    }

    await deleteMarkedAuthorizations(session, requestId, avatar.memberID);
  } catch (error) {
    logger.error(`Error processing ${isDCOGive ? 'DCO_GIVE template' : 'avatar'}`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      avatarId: avatar.memberID,
      type: isDCOGive ? 'DCO_GIVE' : 'REGULAR'
    });
    // TODO: Implement member notification about the failure
    logger.warn(
      `Placeholder: Notify member about the failure in processing their ${isDCOGive ? 'DCO_GIVE template' : 'recurring avatar'}`,
      { requestId, avatarId: avatar.memberID }
    );
  }
}

/**
 * DCOavatars function
 * This function is run as part of the DCO process to handle recurring transactions.
 * It processes both DCO_GIVE templates (which feed into DCO calculations) and
 * regular recurring transactions.
 */
export async function DCOavatars(): Promise<void> {
  logger.info("Starting DCOavatars process");
  const ledgerSpaceSession: Session = ledgerSpaceDriver.session();

  try {
    // Process DCO_GIVE templates first as they feed into DCO calculations
    const dcoGiveTemplates = await getActiveDCOGiveTemplates(ledgerSpaceSession);
    logger.info(`Found ${dcoGiveTemplates.length} active DCO_GIVE templates`);

    for (const templateData of dcoGiveTemplates) {
      await processAvatar(ledgerSpaceSession, templateData, true);
    }

    // Then process regular recurring transactions
    const activeAvatars = await getActiveRecurringAvatars(ledgerSpaceSession);
    logger.info(`Found ${activeAvatars.length} active recurring avatars`);

    for (const avatarData of activeAvatars) {
      await processAvatar(ledgerSpaceSession, avatarData, false);
    }

    logger.info("DCOavatars process completed", {
      dcoGiveTemplatesProcessed: dcoGiveTemplates.length,
      regularAvatarsProcessed: activeAvatars.length
    });
  } catch (error) {
    logger.error("Error in DCOavatars", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Re-throw to ensure DCO process knows about the failure
  } finally {
    logger.debug("Closing ledgerSpace session");
    await ledgerSpaceSession.close();
  }
}
