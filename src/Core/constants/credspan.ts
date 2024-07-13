import { ledgerSpaceDriver } from "../../../config/neo4j";
import moment from "moment-timezone";

export const credspan = 35;

export async function checkDueDate(dueDate: any): Promise<boolean> {
  const dueDateMoment = moment.utc(dueDate, "YYYY-MM-DD", true);
  if (!dueDateMoment.isValid()) {
    console.error("Due date not in valid format");
    return false;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const currentDateQuery = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: TRUE})
      RETURN daynode.Date AS today
    `);
  const today = currentDateQuery.records[0].get("today");
  if (!today) {
    console.log("could not get date from daynode");
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
    console.error("Due date is not within permitted credspan");
    return false;
  }
  return true;
}
