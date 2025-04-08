import { Session } from "neo4j-driver";
import axios from "axios";
import _ from "lodash";
import logger from "../../../utils/logger";
import { AvatarData } from "./types";
import { getDenominations } from "../../../core-cron/constants/denominations";

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
    MATCH (daynode:Daynode {Active: true})
    MATCH (avatar:Recurring)
    WHERE avatar.status = 'ACTIVE'
    AND avatar.templateType = 'REGULAR'
    AND date(avatar.nextPayDate) <= date(daynode.Date)
    AND (avatar.remainingPays IS NULL OR avatar.remainingPays > 0)
    AND avatar.lastProcessed IS NULL
    MATCH (issuer:Account)-[:ACTIVE]->(avatar)-[:ACTIVE]->(acceptor:Account)
    RETURN
      avatar,
      issuer.accountID as issuerAccountID,
      acceptor.accountID as acceptorAccountID,
      daynode.Date as date
  `;

  try {
    const result = await session.run(query);
    const avatars: AvatarData[] = result.records.map((record) => {
      const avatarProps = record.get("avatar").properties;
      return {
        avatar: {
          signerID: avatarProps.recurringID, // Use recurringID as signerID
          Denomination: avatarProps.Denomination,
          InitialAmount: avatarProps.InitialAmount,
          securedCredex: avatarProps.securedCredex || false,
          credspan: avatarProps.credspan || "30",
          remainingPays: avatarProps.remainingPays,
          nextPayDate: avatarProps.nextPayDate,
          status: avatarProps.status,
          templateType: avatarProps.templateType
        },
        issuerAccountID: record.get("issuerAccountID"),
        acceptorAccountID: record.get("acceptorAccountID"),
        date: record.get("date"),
      };
    });

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
    AND date(template.nextPayDate) <= date(daynode.Date)
    AND (template.remainingPays IS NULL OR template.remainingPays > 0)
    AND template.lastProcessed IS NULL
    MATCH (issuer:Account)-[:ACTIVE]->(template)-[:ACTIVE]->(target:Account)
    WHERE target.isCredexFoundation = true
    WITH DISTINCT template, issuer, target, daynode
    RETURN
      template.recurringID as recurringID,
      template,
      issuer.accountID as issuerAccountID,
      target.accountID as acceptorAccountID,
      daynode.Date as date,
      daynode
  `;

  try {
    const result = await session.run(query);
    
    if (!result.records || result.records.length === 0) {
      logger.debug("No active DCO_GIVE templates found");
      return [];
    }

    // Fetch current exchange rates from OpenExchangeRates API
    const symbols = getDenominations({
      sourceForRate: "OpenExchangeRates",
      formatAsList: true,
    }) as string;

    const nextDate = result.records[0].get("date");
    const { data: { rates: USDbaseRates } } = await axios.get(
      `https://openexchangerates.org/api/historical/${nextDate}.json`,
      { params: { app_id: process.env.OPEN_EXCHANGE_RATES_API, symbols } }
    );

    // Convert USD rates to XAU-based rates
    const denomsInXAU = _.mapValues(
      USDbaseRates,
      (value) => value / USDbaseRates.XAU
    );

    const templates: AvatarData[] = result.records.map((record) => {
      const template = record.get("template").properties;
      const recurringID = record.get("recurringID");
      const daynode = record.get("daynode").properties;
      
      // Calculate InitialAmount using XAU normalization
      const DCOgiveInCXX = parseFloat(template.DCOgiveInCXX);
      const InitialAmount = DCOgiveInCXX / denomsInXAU[template.DCOdenom];

      // Transform template properties to match avatar structure
      // For DCO_GIVE templates:
      // - Use recurringID as signerID (Recurring node is the signer)
      // - Use DCOdenom for denomination
      const avatar = {
        signerID: recurringID, // Recurring node's ID for signing
        Denomination: template.DCOdenom,
        InitialAmount,
        securedCredex: true,
        credspan: template.credspan || "30",
        remainingPays: template.remainingPays,
        nextPayDate: template.nextPayDate,
        status: template.status,
        templateType: template.templateType
      };

      logger.debug('Transformed DCO_GIVE template', { 
        recurringID, // Recurring node's ID used for signing
        issuerAccountID: record.get("issuerAccountID"), // Account ID used for balance check
        denomination: avatar.Denomination,
        initialAmount: avatar.InitialAmount,
        DCOgiveInCXX,
        xauBasedRate: denomsInXAU[template.DCOdenom]
      });

      return {
        avatar,
        issuerAccountID: record.get("issuerAccountID"), // Used for balance checking
        acceptorAccountID: record.get("acceptorAccountID"),
        date: record.get("date"),
      };
    });

    logger.debug(`Found ${templates.length} active DCO_GIVE templates`);
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
 * Updates the lastProcessed timestamp and sets the next payment date
 * based on the template's payFrequency (in days).
 */
export async function deleteMarkedAuthorizations(
  session: Session,
  requestId: string,
  avatarId: string
): Promise<void> {
  logger.debug("Updating template processing status", { requestId, avatarId });

  const query = `
    MATCH (daynode:Daynode {Active: true})
    MATCH (avatar:Recurring {recurringID: $avatarId})
    WHERE avatar.status = 'ACTIVE'
    SET avatar.lastProcessed = datetime(),
        avatar.nextPayDate = date(daynode.Date) + duration.inDays(avatar.payFrequency).days
    WITH avatar
    MATCH (avatar)-[r:MARKED_FOR_DELETION]->()
    DELETE r
    RETURN count(r) as deletedCount
  `;

  try {
    const result = await session.run(query, { avatarId });
    const deletedCount = result.records[0].get("deletedCount").toNumber();
    logger.debug(`Updated template and deleted ${deletedCount} marked authorizations`, {
      requestId,
      avatarId,
      deletedCount,
    });
  } catch (error) {
    logger.error("Error updating template processing status", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      avatarId,
    });
    throw error;
  }
}
