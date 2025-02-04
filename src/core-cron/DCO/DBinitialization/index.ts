import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";
import { setupDatabaseConstraints } from "./constraints";
import {
  establishDayZero,
  fetchAndProcessRates,
  createDayZeroDaynode,
} from "./dayZero";
import { createInitialMember } from "./members";
import {
  createInitialAccount,
  createInitialTrustAccount,
  createCredexFoundation,
} from "./accounts";
import { createDCOrecurringTemplate } from "./recurring";
import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
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
      searchSpace: searchSpaceDriver.session(),
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
      searchSpace: searchSpaceDriver.session(),
    };

    try {
      await createDayZeroDaynode(
        daynodeSession,
        dayZero,
        dayZeroCXXrates,
        requestId
      );
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
      searchSpace: searchSpaceDriver.session(),
    };

    try {
      // Create initial member
      const rdubs = await createInitialMember(
        "Ryan",
        "Watson",
        "263778177125",
        "USD",
        true, // DCO participant
        requestId
      );

      // Create initial accounts
      const credexFoundationID = await createInitialAccount(
        rdubs.onboardedMemberID,
        "TRUST",
        "Credex Foundation: Daily Credcoin Offering",
        "CREDEX_FOUNDATION_TRUST",
        "CXX",
        requestId
      );
      const greatSunTrustID = await createInitialTrustAccount(
        rdubs.onboardedMemberID,
        "Great Sun Financial Trust CAD", // accountName
        "GREATSUN_TRUST_CAD", // accountHandle
        "BANK", // subtype
        "CAD", // denomination
        {
          jurisdiction: "CA",
          accountNumber: "5394119",
          transitNumber: "03353",
          branchNumber: "003",
        },
        requestId
      );
      const greatSunOpsID = await createInitialAccount(
        rdubs.onboardedMemberID,
        "OPERATIONS",
        "Great Sun Financial: Operations",
        "GREATSUN_OPS",
        "CAD",
        requestId
      );

      // Create relationships between foundation and trust accounts
      await createCredexFoundation(
        memberSession,
        credexFoundationID,
        requestId
      );

      // Create initial secured credex from greatSunTrust
      const initialCredexResult = await CreateCredexService({
        signerID: rdubs.onboardedMemberID,
        issuerAccountID: greatSunTrustID,
        receiverAccountID: rdubs.defaultAccountID,
        InitialAmount: 28,
        Denomination: "CAD",
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
        requestId,
      });

      if (!initialCredexResult.success) {
        logger.error("Failed to create initial secured credex", {
          error: initialCredexResult.message,
          details: initialCredexResult.error,
          requestId,
        });
        throw new Error("Failed to create initial secured credex");
      }

      logger.info("Initial secured credex created successfully", {
        credexID: initialCredexResult.data?.credexID,
        requestId,
      });

      // Accept the secured credex
      const acceptResult = await AcceptCredexService(
        initialCredexResult.data!.credexID,
        rdubs.onboardedMemberID,
        requestId
      );

      if (!acceptResult.success) {
        logger.error("Failed to accept initial secured credex", {
          error: acceptResult.message,
          details: acceptResult.error,
          requestId,
        });
        throw new Error("Failed to accept initial secured credex");
      }

      logger.info("Initial secured credex accepted successfully", {
        credexID: initialCredexResult.data?.credexID,
        requestId,
      });

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
        foundationOwner: rdubs.onboardedMemberID,
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
