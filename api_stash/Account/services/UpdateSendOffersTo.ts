import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface ServiceResponse {
  success: boolean;
  message: string;
  data?: {
    accountID: string;
    sendOffersTo: {
      memberID: string;
      firstname: string;
      lastname: string;
    };
  };
}

export async function UpdateSendOffersToService(
  memberIDtoSendOffers: string,
  accountID: string,
  ownerID: string
): Promise<ServiceResponse> {
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
          (newMemberForOffers:Member { memberID: $memberIDtoSendOffers})
          -[:AUTHORIZED_FOR]->(account:Account { accountID: $accountID})
          <-[:OWNS]-(owner:Member { memberID: $ownerID})
      OPTIONAL MATCH (account)-[currentAccountForOffersRel:SEND_OFFERS_TO]->(:Member)
      DELETE currentAccountForOffersRel
      CREATE (account)-[:SEND_OFFERS_TO]->(newMemberForOffers)
      RETURN newMemberForOffers {
          .memberID,
          .firstname,
          .lastname
      } as memberDetails
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
      return {
        success: false,
        message: "Failed to update send offers recipient. Please verify the member is authorized for this account."
      };
    }

    const memberDetails = result.records[0].get('memberDetails');

    logger.info("Send offers recipient updated successfully", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });

    return {
      success: true,
      message: "Send offers recipient updated successfully",
      data: {
        accountID,
        sendOffersTo: {
          memberID: memberDetails.memberID,
          firstname: memberDetails.firstname,
          lastname: memberDetails.lastname
        }
      }
    };
  } catch (error) {
    logger.error("Error updating account to receive offer notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update send offers recipient"
    };
  } finally {
    logger.debug("Closing database session", {
      memberIDtoSendOffers,
      accountID,
      ownerID,
    });
    await ledgerSpaceSession.close();
  }
}
