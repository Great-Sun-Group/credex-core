import { Session } from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AvatarData, Avatar, hasValidCredexData } from "./types";
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
 * Validates avatar data structure
 */
function validateAvatarData(avatarData: AvatarData, isDCOGive: boolean): void {
  if (!avatarData) {
    throw new Error('Avatar data is null or undefined');
  }

  const { avatar, issuerAccountID, acceptorAccountID } = avatarData;

  if (!avatar) {
    logger.error('Avatar object is missing', { avatarData });
    throw new Error('Avatar object is missing');
  }

  if (!avatar.signerID) {
    logger.error('Invalid avatar structure - missing signerID', {
      avatar,
      isDCOGive
    });
    throw new Error('Invalid avatar data: signerID is required');
  }

  if (!issuerAccountID || !acceptorAccountID) {
    logger.error('Missing account IDs', {
      issuerAccountID,
      acceptorAccountID,
      avatarId: avatar.signerID
    });
    throw new Error('Missing account IDs');
  }

  // Additional validation for DCO_GIVE templates
  if (isDCOGive) {
    if (!avatar.Denomination) {
      throw new Error('Invalid DCO_GIVE template: missing Denomination');
    }
    if (typeof avatar.InitialAmount !== 'number' || isNaN(avatar.InitialAmount)) {
      logger.error('Invalid InitialAmount in DCO_GIVE template', {
        initialAmount: avatar.InitialAmount,
        avatarId: avatar.signerID
      });
      throw new Error('Invalid DCO_GIVE template: InitialAmount must be a valid number');
    }
  }
}

/**
 * Processes a single avatar/template
 */
async function processAvatar(
  session: Session,
  avatarData: AvatarData,
  isDCOGive: boolean = false
): Promise<void> {
  try {
    // Validate avatar data structure
    validateAvatarData(avatarData, isDCOGive);

    const { avatar, issuerAccountID, acceptorAccountID, date } = avatarData;
    const requestId = uuidv4();

    logger.debug(`Processing ${isDCOGive ? 'DCO_GIVE template' : 'avatar'}`, {
      requestId,
      avatarId: avatar.signerID,
      type: isDCOGive ? 'DCO_GIVE' : 'REGULAR',
      denomination: avatar.Denomination,
      initialAmount: avatar.InitialAmount
    });

    const offerData = prepareOfferData(
      avatar,
      issuerAccountID,
      acceptorAccountID,
      date,
      requestId
    );

    const offerResult = await createCredexOffer(offerData);

    if (hasValidCredexData(offerResult) && offerResult.data) {
      const credexData = offerResult.data;
      // All recurring templates are auto-accepted by the acceptor account
      await acceptCredexOffer(
        credexData.credexID,
        acceptorAccountID,  // Always use acceptor's ID for auto-acceptance
        requestId
      );
      logger.info(
        `Successfully created and accepted credex for ${isDCOGive ? 'DCO_GIVE template' : 'recurring avatar'}`,
        {
          requestId,
          avatarId: avatar.signerID,
          type: isDCOGive ? 'DCO_GIVE' : 'REGULAR',
          credexId: credexData.credexID
        }
      );
    } else {
      throw new Error(`Failed to create offer for ${isDCOGive ? 'DCO_GIVE template' : 'avatar'}: ${avatar.signerID}`);
    }

    await deleteMarkedAuthorizations(session, requestId, avatar.signerID);
  } catch (error) {
    logger.error(`Error processing ${isDCOGive ? 'DCO_GIVE template' : 'avatar'}`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      avatarData
    });
    throw error; // Re-throw to ensure proper error handling up the chain
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
