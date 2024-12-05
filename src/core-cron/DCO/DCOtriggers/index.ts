import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { TriggerResult, TriggerContext } from "./types";
import { updateMemberTiers } from "./database";
import logger from "../../../utils/logger";

/**
 * Updates member tiers based on subscription status
 */
async function memberTierTrigger(context: TriggerContext): Promise<TriggerResult> {
  try {
    const updates = await updateMemberTiers(context);
    return {
      success: true,
      message: `Successfully processed ${updates.length} member tier updates`
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update member tiers",
      error: error instanceof Error ? error : new Error("Unknown error")
    };
  }
}

/**
 * Main trigger execution function
 * New triggers can be added here as needed
 */
export async function DCOtriggersExecute(): Promise<void> {
  const requestId = uuidv4();
  logger.info("Starting DCOtriggersExecute process", { requestId });
  
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const context: TriggerContext = {
    session: ledgerSpaceSession,
    requestId
  };

  try {
    // Execute member tier updates
    const tierResult = await memberTierTrigger(context);
    if (!tierResult.success) {
      logger.error("Member tier trigger failed", {
        error: tierResult.error,
        message: tierResult.message,
        requestId
      });
    } else {
      logger.info("Member tier trigger completed", {
        message: tierResult.message,
        requestId
      });
    }

    // Future triggers can be added here
    // Example:
    // const otherResult = await otherTrigger(context);
    // if (!otherResult.success) {
    //   logger.error("Other trigger failed", {
    //     error: otherResult.error,
    //     message: otherResult.message,
    //     requestId
    //   });
    // }

    logger.info("DCOtriggersExecute process completed successfully", { requestId });
  } catch (error) {
    logger.error("Error in DCOtriggersExecute", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Closed ledgerSpace session", { requestId });
  }
}
