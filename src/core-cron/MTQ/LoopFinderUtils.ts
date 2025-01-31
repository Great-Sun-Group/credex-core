import * as neo4j from "neo4j-driver";
import logger from "../../utils/logger";

export function getSearchOwesType(credexSecuredDenom: string, trustAccountID?: string): string {
  if (credexSecuredDenom === "UNSECURED") {
    return "UNSECURED";
  }
  
  // Take first 12 chars of UUID and remove hyphens
  const shortID = trustAccountID?.substring(0, 12).replace(/-/g, '');
  return `TRUST_${shortID}_${credexSecuredDenom}`;
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
  if (credexSecuredDenom !== "UNSECURED") {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.Date AS today
    `);
    return result.records[0].get("today");
  }
  return credexDueDate;
}
