import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";
import { setupDatabaseConstraints } from "./constraints";
import { establishDayZero, fetchAndProcessRates, createDayZeroDaynode } from "./dayZero";
import { createInitialMember } from "./members";
import { createInitialAccount, createInitialRelationships } from "./accounts";
import { createInitialCredex } from "./credex";
import logger from "../../../utils/logger";
import { v4 as uuidv4 } from "uuid";

/**
 * Initializes the database for the Daily Credcoin Offering (DCO) process.
 * This function sets up necessary constraints, creates initial accounts,
 * and establishes the starting state for the DCO.
 */
export async function DBinitialization(): Promise<void> {
  const requestId = uuidv4();
  logger.info("Starting DBinitialization", { requestId });

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  const sessions = {
    ledgerSpace: ledgerSpaceSession,
    searchSpace: searchSpaceSession
  };

  try {
    await setupDatabaseConstraints(sessions, requestId);
    const dayZero = establishDayZero(requestId);
    const dayZeroCXXrates = await fetchAndProcessRates(dayZero, requestId);
    await createDayZeroDaynode(sessions, dayZero, dayZeroCXXrates, requestId);

    // Create initial members
    const rdubs = await createInitialMember(
      "Ryan",
      "Watson",
      "263778177125",
      "USD",
      true,
      requestId
    );
    const magicmike = await createInitialMember(
      "Mike",
      "Dube",
      "263787379972",
      "USD",
      false,
      requestId
    );
    const bennita = await createInitialMember(
      "Bennita",
      "Muranda",
      "263788435091",
      "USD",
      false,
      requestId
    );

    // Create initial accounts
    const credexFoundationID = await createInitialAccount(
      rdubs.onboardedMemberID,
      "CREDEX_FOUNDATION",
      "Credex Foundation: Daily Credcoin Offering",
      "credexfoundation.dco",
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
      sessions,
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

  } catch (error) {
    logger.error("Error during DBinitialization", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    logger.info("DBinitialization completed", { requestId });
  }
}
