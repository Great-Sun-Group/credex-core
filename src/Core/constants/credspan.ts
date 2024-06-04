import moment from "moment-timezone";

export const credspan = 35;

export function checkDueDate(dueDate: any): boolean {

  const dueDateMoment = moment.utc(dueDate, "YYYY-MM-DD", true);
  const lastPermittedDayMoment = moment.utc().add(credspan, "days");
  const firstPermittedDayMoment = moment.utc().add(6, "days");

  if (!dueDateMoment.isValid()) {
    console.error("Due date not in valid format");
    return false;
  }
  if (
    dueDateMoment > lastPermittedDayMoment ||
    dueDateMoment < firstPermittedDayMoment
  ) {
    console.error("Due date is not within permitted credspan");
    return false;
  }
  return true;
}
