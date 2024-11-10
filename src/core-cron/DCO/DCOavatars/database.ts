import { Session } from "neo4j-driver";
import logger from "../../../utils/logger";
import { AvatarData } from "./types";

/**
 * Fetches active recurring avatars that are due for processing.
 * Only fetches REGULAR templates, as DCO_GIVE templates are handled
 * separately as part of the DCO process.
 */
export async function getActiveRecurringAvatars(
  session: Session
): Promise<AvatarData[]> {
  logger.debug("Fetching active recurring avatars");

  const query = `
    MATCH (avatar:Recurring)
    WHERE avatar.status = 'ACTIVE'
    AND avatar.templateType = 'REGULAR'
    AND date(avatar.nextPayDate) <= date()
    AND (avatar.remainingPays IS NULL OR avatar.remainingPays > 0)
    MATCH (issuer:Account)-[:ACTIVE]->(avatar)-[:ACTIVE]->(acceptor:Account)
    RETURN
      avatar,
      issuer.accountID as issuerAccountID,
      acceptor.accountID as acceptorAccountID,
      date() as date
  `;

  try {
    const result = await session.run(query);
    const avatars: AvatarData[] = result.records.map((record) => ({
      avatar: record.get("avatar").properties,
      issuerAccountID: record.get("issuerAccountID"),
      acceptorAccountID: record.get("acceptorAccountID"),
      date: record.get("date"),
    }));

    logger.debug(`Found ${avatars.length} active recurring avatars`);
    return avatars;
  } catch (error) {
    logger.error("Error fetching active recurring avatars", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Fetches active DCO_GIVE templates that are due for processing.
 * These templates represent secured credex transfers to the foundation
 * and are processed before DCO rate calculations.
 */
export async function getActiveDCOGiveTemplates(
  session: Session
): Promise<AvatarData[]> {
  logger.debug("Fetching active DCO_GIVE templates");

  const query = `
    MATCH (daynode:Daynode {Active: true})
    MATCH (template:Recurring)
    WHERE template.status = 'ACTIVE'
    AND template.templateType = 'DCO_GIVE'
    AND date(template.nextPayDate) <= date()
    AND (template.remainingPays IS NULL OR template.remainingPays > 0)
    MATCH (source:Account)-[:ACTIVE]->(template)-[:ACTIVE]->(target:Account)
    WHERE target.accountType = "CREDEX_FOUNDATION"
    WITH template, source, target, daynode, date() as currentDate
    WITH {
      memberID: template.memberID,
      Denomination: template.DCOdenom,
      InitialAmount: template.DCOgiveInCXX / daynode[template.DCOdenom],
      securedCredex: true,
      credspan: template.credspan,
      remainingPays: template.remainingPays,
      nextPayDate: template.nextPayDate,
      status: template.status,
      templateType: template.templateType
    } as avatar,
    source.accountID as issuerAccountID,
    target.accountID as acceptorAccountID,
    currentDate as date
    RETURN avatar, issuerAccountID, acceptorAccountID, date
  `;

  try {
    const result = await session.run(query);
    const templates: AvatarData[] = result.records.map((record) => ({
      avatar: record.get("avatar"),
      issuerAccountID: record.get("issuerAccountID"),
      acceptorAccountID: record.get("acceptorAccountID"),
      date: record.get("date"),
    }));

    logger.debug(`Found ${templates.length} active DCO_GIVE templates`, {
      templateDetails: templates.map((t) => ({
        memberID: t.avatar.memberID,
        nextPayDate: t.avatar.nextPayDate,
        status: t.avatar.status,
        templateType: t.avatar.templateType,
        denomination: t.avatar.Denomination,
        initialAmount: t.avatar.InitialAmount,
      })),
    });
    return templates;
  } catch (error) {
    logger.error("Error fetching active DCO_GIVE templates", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Deletes marked authorizations for a given avatar.
 */
export async function deleteMarkedAuthorizations(
  session: Session,
  requestId: string,
  avatarId: string
): Promise<void> {
  logger.debug("Deleting marked authorizations", { requestId, avatarId });

  const query = `
    MATCH (avatar:Recurring {memberID: $avatarId})
    WHERE avatar.status = 'ACTIVE'
    SET avatar.lastProcessed = datetime()
    WITH avatar
    MATCH (avatar)-[r:MARKED_FOR_DELETION]->()
    DELETE r
    RETURN count(r) as deletedCount
  `;

  try {
    const result = await session.run(query, { avatarId });
    const deletedCount = result.records[0].get("deletedCount").toNumber();
    logger.debug(`Deleted ${deletedCount} marked authorizations`, {
      requestId,
      avatarId,
      deletedCount,
    });
  } catch (error) {
    logger.error("Error deleting marked authorizations", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      avatarId,
    });
    throw error;
  }
}
