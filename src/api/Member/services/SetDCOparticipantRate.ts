import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

export async function SetDCOparticipantRate(
  memberID: string,
  personalAccountID: string,
  DCOgiveInCXX: number,
  DCOdenom: string
): Promise<any> {
  logger.debug("SetDCOparticipantRate called", { memberID, personalAccountID, DCOgiveInCXX, DCOdenom });

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query", { memberID, personalAccountID });
    const result = await ledgerSpaceSession.run(
      `
      MATCH (DCOparticipant:Account { accountID: $personalAccountID } )<-[:OWNS]-(DCOmember:Member { memberID: $memberID } )
      SET
       DCOparticipant.DCOgiveInCXX = $DCOgiveInCXX,
       DCOparticipant.DCOdenom = $DCOdenom
      RETURN DCOparticipant
      `,
      { memberID, personalAccountID, DCOgiveInCXX, DCOdenom }
    );

    if (result.records.length === 0) {
      logger.warn("No matching DCO participant found", { memberID, personalAccountID });
      return { success: false, error: "No matching DCO participant found" };
    }

    const updatedParticipant = result.records[0].get("DCOparticipant").properties;

    logger.info("DCO participant rate set successfully", { memberID, personalAccountID });
    return { success: true, data: updatedParticipant };
  } catch (error) {
    logger.error("Error setting DCO participant rate", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      personalAccountID,
    });
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  } finally {
    logger.debug("Closing database session", { memberID, personalAccountID });
    await ledgerSpaceSession.close();
  }
}
