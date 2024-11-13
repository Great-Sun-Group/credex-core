import * as neo4j from "neo4j-driver";
import logger from "../../utils/logger";

export function getSearchOwesType(credexSecuredDenom: string): string {
  return credexSecuredDenom !== "floating"
    ? `${credexSecuredDenom}_SECURED`
    : "UNSECURED";
}

export async function adjustCredexDueDate(
  session: neo4j.Session,
  credexSecuredDenom: string,
  credexDueDate: string
): Promise<string> {
  logger.debug("Adjusting credex due date", {
    credexSecuredDenom,
    credexDueDate,
  });
  if (credexSecuredDenom !== "floating") {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.Date AS today
    `);
    return result.records[0].get("today");
  }
  return credexDueDate;
}
