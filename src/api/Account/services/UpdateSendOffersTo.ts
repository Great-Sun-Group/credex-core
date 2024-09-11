import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

export async function UpdateSendOffersToService(
  memberIDtoSendOffers: string,
  accountID: string,
  ownerID: string
) {
  logger.debug("UpdateSendOffersToService called", {
    memberIDtoSendOffers,
    accountID,
    ownerID,
  });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query to update send offers recipient");
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (newMemberForOffers: Member { memberID: $memberIDtoSendOffers})
                -[:AUTHORIZED_FOR]->(account:Account { accountID: $accountID})
                <-[:OWNS]-(owner:Member { memberID: $ownerID}),
                (account)-[currentAccountForOffersRel:SEND_OFFERS_TO]->(:Member)
            DELETE currentAccountForOffersRel
            CREATE (account)-[:SEND_OFFERS_TO]->(newMemberForOffers)
            RETURN true
            `,
      {
        memberIDtoSendOffers,
        accountID,
        ownerID,
      }
    );

    if (!result.records.length) {
      logger.warn("Failed to update send offers recipient", {
        memberIDtoSendOffers,
        accountID,
        ownerID,
      });
      return false;
    }

    logger.info("Send offers recipient updated successfully", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    return true;
  } catch (error) {
    logger.error("Error updating account to receive offer notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    return false;
  } finally {
    logger.debug("Closing database session", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    await ledgerSpaceSession.close();
  }
}
