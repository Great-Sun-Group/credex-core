import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../../config/logger";

export async function GetMemberByHandleService(
  memberHandle: string
): Promise<any | null> {
  logger.debug("GetMemberByHandleService called", { memberHandle });

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  if (!memberHandle) {
    logger.warn("GetMemberByHandleService called with empty memberHandle");
    return null;
  }

  try {
    logger.debug("Executing database query", { memberHandle });
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { memberHandle: $memberHandle })
            RETURN
              member.memberID AS memberID,
              member.firstname AS firstname,
              member.lastname AS lastname
        `,
      { memberHandle }
    );

    if (!result.records.length) {
      logger.info("Member not found in database", { memberHandle });
      return null;
    }

    const memberID = result.records[0].get("memberID");
    const firstname = result.records[0].get("firstname");
    const lastname = result.records[0].get("lastname");

    logger.info("Member retrieved from database", { memberID, memberHandle });
    return {
      memberID: memberID,
      memberName: `${firstname} ${lastname}`,
    };
  } catch (error) {
    logger.error("Error fetching member data from database", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberHandle 
    });
    return false;
  } finally {
    logger.debug("Closing database session", { memberHandle });
    await ledgerSpaceSession.close();
  }
}
