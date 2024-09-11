import { ledgerSpaceDriver } from "../../config/neo4j";
import moment from "moment-timezone";
import logger from "../utils/logger";

export const credspan = 35;

export async function checkDueDate(dueDate: any): Promise<boolean> {
  logger.debug("checkDueDate function called", { dueDate });

  const dueDateMoment = moment.utc(dueDate, "YYYY-MM-DD", true);
  if (!dueDateMoment.isValid()) {
    logger.error("Due date not in valid format", { dueDate });
    return false;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    logger.debug("Executing database query to get current date");
    const currentDateQuery = await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode {Active: TRUE})
      RETURN daynode.Date AS today
    `);
    const today = currentDateQuery.records[0].get("today");
    if (!today) {
      logger.error("Could not get date from daynode");
      return false;
    }

    const lastPermittedDayMoment = moment(today)
      .subtract(1, "months") // because of diff date formats
      .add(credspan, "days");
    const firstPermittedDayMoment = moment(today)
      .subtract(1, "months") // because of diff date formats
      .add(7, "days");

    if (
      dueDateMoment >= lastPermittedDayMoment ||
      dueDateMoment < firstPermittedDayMoment
    ) {
      logger.error("Due date is not within permitted credspan", {
        dueDate,
        firstPermittedDay: firstPermittedDayMoment.format("YYYY-MM-DD"),
        lastPermittedDay: lastPermittedDayMoment.format("YYYY-MM-DD"),
      });
      return false;
    }

    logger.debug("Due date is within permitted credspan", { dueDate });
    return true;
  } catch (error) {
    logger.error("Error checking due date", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      dueDate,
    });
    return false;
  } finally {
    logger.debug("Closing database session");
    await ledgerSpaceSession.close();
  }
}
