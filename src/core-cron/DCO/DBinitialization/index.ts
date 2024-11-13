import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";
import { setupDatabaseConstraints } from "./constraints";
import { establishDayZero, fetchAndProcessRates, createDayZeroDaynode } from "./dayZero";
import { createInitialMember } from "./members";
import { createInitialAccount, createInitialRelationships } from "./accounts";
import { createInitialCredex } from "./credex";
import { createDCOrecurringTemplate } from "./recurring";
import logger from "../../../utils/logger";
import { v4 as uuidv4 } from "uuid";

/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * establishes the starting state for the DCO, and creates rdubs' DCO_GIVE template.
 */
export async function DBinitialization(): Promise<void> {
  const requestId = uuidv4();
  logger.info("Starting DBinitialization", { requestId });

  try {
    // Set up database constraints and initial state
    const constraintSession = {
      ledgerSpace: ledgerSpaceDriver.session(),
      searchSpace: searchSpaceDriver.session()
    };
    
    try {
      await setupDatabaseConstraints(constraintSession, requestId);
    } finally {
      await constraintSession.ledgerSpace.close();
      await constraintSession.searchSpace.close();
    }

    // Create initial daynode
    const dayZero = establishDayZero(requestId);
    const dayZeroCXXrates = await fetchAndProcessRates(dayZero, requestId);
    
    const daynodeSession = {
      ledgerSpace: ledgerSpaceDriver.session(),
      searchSpace: searchSpaceDriver.session()
    };
    
    try {
      await createDayZeroDaynode(daynodeSession, dayZero, dayZeroCXXrates, requestId);
      // Verify daynode was created
      const verifyResult = await daynodeSession.ledgerSpace.run(
        "MATCH (d:Daynode {Active: true}) RETURN d"
      );
      if (verifyResult.records.length === 0) {
        throw new Error("Failed to verify daynode creation");
      }
      logger.info("Day zero daynode verified", { requestId });
    } finally {
      await daynodeSession.ledgerSpace.close();
      await daynodeSession.searchSpace.close();
    }

    // Create initial members with a new session
    const memberSession = {
      ledgerSpace: ledgerSpaceDriver.session(),
      searchSpace: searchSpaceDriver.session()
    };

    try {
      // Create initial members
      const rdubs = await createInitialMember(
        "Ryan",
        "Watson",
        "263778177125",
        "USD",
        true, // DCO participant
        requestId
      );
      const magicmike = await createInitialMember(
        "Mike",
        "Dube",
        "263787379972",
        "USD",
        false, // Not a DCO participant
        requestId
      );
      const bennita = await createInitialMember(
        "Bennita",
        "Muranda",
        "263788435091",
        "USD",
        false, // Not a DCO participant
        requestId
      );

      // Create initial accounts
      const credexFoundationID = await createInitialAccount(
        rdubs.onboardedMemberID,
        "CREDEX_FOUNDATION",
        "Credex Foundation: Daily Credcoin Offering",
        "credex_foundation_dco",
        "CXX",
        requestId
      );
      const greatSunTrustID = await createInitialAccount(
        rdubs.onboardedMemberID,
        "TRUST",
        "Great Sun Financial: Trust",
        "greatsun_trust",
        "CAD",
        requestId
      );
      const greatSunOpsID = await createInitialAccount(
        rdubs.onboardedMemberID,
        "OPERATIONS",
        "Great Sun Financial: Operations",
        "greatsun_ops",
        "CAD",
        requestId
      );
      const vimbisoPayTrustID = await createInitialAccount(
        bennita.onboardedMemberID,
        "TRUST",
        "VimbisoPay: Trust",
        "vimbisopay_trust",
        "USD",
        requestId
      );
      const vimbisoPayOpsID = await createInitialAccount(
        magicmike.onboardedMemberID,
        "OPERATIONS",
        "VimbisoPay: Operations",
        "vimbisopay_ops",
        "USD",
        requestId
      );

      // Create relationships and initial Credex
      await createInitialRelationships(
        memberSession,
        credexFoundationID,
        greatSunTrustID,
        vimbisoPayTrustID,
        vimbisoPayOpsID,
        rdubs.onboardedMemberID,
        bennita.onboardedMemberID,
        requestId
      );
      await createInitialCredex(
        rdubs.onboardedMemberID,
        greatSunTrustID,
        rdubs.defaultAccountID,
        requestId
      );

      // Create rdubs' DCO_GIVE template
      await createDCOrecurringTemplate(
        rdubs.onboardedMemberID,
        credexFoundationID,
        rdubs.defaultAccountID,
        memberSession.ledgerSpace,
        requestId
      );

      logger.info("DBinitialization completed successfully", {
        requestId,
        foundationID: credexFoundationID,
        foundationOwner: rdubs.onboardedMemberID
      });

    } finally {
      await memberSession.ledgerSpace.close();
      await memberSession.searchSpace.close();
    }

  } catch (error) {
    logger.error("Error during DBinitialization", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });
    throw error;
  }
}
