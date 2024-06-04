import moment from "moment-timezone";

export const credspan = 35;

export function checkDueDate(dueDate: string): boolean {
  const dueDateMoment = moment.utc(dueDate).format("YYYY-MM-DD");
  const lastPermittedDay = moment
    .utc()
    .add(credspan, "days")
    .format("YYYY-MM-DD");

  if (dueDateMoment >= lastPermittedDay) {
    console.error("Due date is beyond permitted credspan");
    return false;
  } else {
    console.log("Due date is within permitted credspan");
    return true;
  }
}
