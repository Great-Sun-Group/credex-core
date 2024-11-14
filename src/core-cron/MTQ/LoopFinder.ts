import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import logger from "../../utils/logger";
import { getSearchOwesType, adjustCredexDueDate } from "./LoopFinderUtils";
import {
  checkCredexExists,
  createSearchSpaceCredex,
  findCredloop,
  cleanupSearchSpace,
  updateLedgerSpace,
  markCredexAsProcessed,
} from "./LoopFinderDB";
import { DatabaseSessions } from "./LoopFinderTypes";

export async function LoopFinder(
  issuerAccountID: string,
  credexID: string,
  credexAmount: number,
  Denomination: string,
  CXXmultiplier: number,
  credexSecuredDenom: string,
  credexDueDate: string,
  acceptorAccountID: string
): Promise<boolean> {
  logger.info("LoopFinder started", {
    issuerAccountID,
    credexID,
    Denomination,
    credexSecuredDenom,
  });

  const sessions: DatabaseSessions = {
    ledgerSpaceSession: ledgerSpaceDriver.session(),
    searchSpaceSession: searchSpaceDriver.session(),
  };

  try {
    const searchOwesType = getSearchOwesType(credexSecuredDenom);
    credexDueDate = await adjustCredexDueDate(
      sessions.ledgerSpaceSession,
      credexSecuredDenom,
      credexDueDate
    );

    const credexExists = await checkCredexExists(
      sessions.searchSpaceSession,
      credexID
    );
    if (!credexExists) {
      await createSearchSpaceCredex(
        sessions.searchSpaceSession,
        issuerAccountID,
        acceptorAccountID,
        credexID,
        credexAmount,
        Denomination,
        CXXmultiplier,
        credexDueDate,
        searchOwesType
      );
    } else {
      logger.info("Credex already exists in SearchSpace", { credexID });
    }

    let searchForCredloops = true;
    while (searchForCredloops) {
      logger.debug("Searching for credloops...");
      const { valueToClear, credexesInLoop, credexesRedeemed } =
        await findCredloop(
          sessions.searchSpaceSession,
          issuerAccountID,
          searchOwesType
        );

      if (credexesInLoop.length > 0) {
        await processCredloop(
          sessions,
          valueToClear,
          credexesInLoop,
          credexesRedeemed
        );
      } else {
        await markCredexAsProcessed(sessions.ledgerSpaceSession, credexID);
        logger.info("No credloops found. Credex marked as processed.", {
          credexID,
        });
        searchForCredloops = false;
      }
    }

    logger.info("LoopFinder completed successfully", { credexID });
    return true;
  } catch (error) {
    logger.error("Error in LoopFinder", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
    });
    return false;
  } finally {
    await sessions.ledgerSpaceSession.close();
    await sessions.searchSpaceSession.close();
  }
}

async function processCredloop(
  sessions: DatabaseSessions,
  valueToClear: number,
  credexesInLoop: string[],
  credexesRedeemed: string[]
): Promise<void> {
  logger.info("Processing credloop", {
    valueToClear,
    credexesInLoopCount: credexesInLoop.length,
    credexesRedeemedCount: credexesRedeemed.length,
  });

  await cleanupSearchSpace(sessions.searchSpaceSession, credexesRedeemed);
  await updateLedgerSpace(
    sessions.ledgerSpaceSession,
    valueToClear,
    credexesInLoop,
    credexesRedeemed
  );
}

// TODO: Implement notification system
/*
async function createNotifications(session: neo4j.Session, loopID: string): Promise<void> {
  // Implementation for creating notifications
}
*/
