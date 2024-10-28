import { ledgerSpaceDriver } from "../../../../config/neo4j";
import * as neo4j from "neo4j-driver";
import logger from "../../../utils/logger";

export async function UpdateMemberTierService(
  memberIDtoUpdate: string,
  newTier: number
) {
  logger.debug("UpdateMemberTierService called", { memberIDtoUpdate, newTier });

  if (newTier < 1 || newTier > 5) {
    logger.warn("Invalid member tier value", { memberIDtoUpdate, newTier });
    return {
      message: "New member tier is not a valid value",
    };
  }
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing database query to update member tier");
    const result = await ledgerSpaceSession.run(
      `
        MATCH (member:Member { memberID: $memberIDtoUpdate })
        SET member.memberTier = $newTier
        RETURN
          member.memberID AS memberIDupdated
      `,
      {
        memberIDtoUpdate,
        newTier: neo4j.int(newTier),
      }
    );

    if (!result.records.length) {
      logger.warn("Member not found for tier update", { memberIDtoUpdate });
      return false;
    }

    const record = result.records[0];

    if (record.get("memberIDupdated")) {
      logger.info("Member tier updated successfully", {
        memberIDtoUpdate,
        newTier,
      });
      return true;
    } else {
      logger.warn("Failed to update member tier", {
        memberIDtoUpdate,
        newTier,
      });
      return false;
    }
  } catch (error) {
    logger.error("Error updating member tier", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberIDtoUpdate,
      newTier,
    });
    return false;
  } finally {
    logger.debug("Closing database session", { memberIDtoUpdate });
    await ledgerSpaceSession.close();
  }
}
