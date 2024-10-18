import express from "express";
import { OfferCredexService } from "../services/OfferCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../constants/credspan";
import { AuthForTierSpendLimitController } from "../../Member/controllers/authForTierSpendLimit";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateDenomination,
  validateAmount,
  validateCredexType,
} from "../../../utils/validators";

/**
 * OfferCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates the required fields, performs additional validations,
 * calls the OfferCredexService, and returns the result along with updated dashboard data.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function OfferCredexController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("OfferCredexController called", { body: req.body, requestId });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
    } = req.body;

    logger.debug("Validating input parameters", {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      requestId,
    });

    // Validate input
    if (!validateUUID(memberID)) {
      logger.warn("Invalid memberID provided", { memberID, requestId });
      return res.status(400).json({ error: "Invalid memberID" });
    }
    if (!validateUUID(issuerAccountID)) {
      logger.warn("Invalid issuerAccountID provided", {
        issuerAccountID,
        requestId,
      });
      return res.status(400).json({ error: "Invalid issuerAccountID" });
    }
    if (!validateUUID(receiverAccountID)) {
      logger.warn("Invalid receiverAccountID provided", {
        receiverAccountID,
        requestId,
      });
      return res.status(400).json({ error: "Invalid receiverAccountID" });
    }
    if (!validateDenomination(Denomination)) {
      logger.warn("Invalid Denomination provided", { Denomination, requestId });
      return res.status(400).json({ error: "Invalid Denomination" });
    }
    if (!validateAmount(InitialAmount)) {
      logger.warn("Invalid InitialAmount provided", {
        InitialAmount,
        requestId,
      });
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }
    if (!validateCredexType(credexType)) {
      logger.warn("Invalid credexType provided", { credexType, requestId });
      return res.status(400).json({ error: "Invalid credexType" });
    }
    if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
      logger.warn("Invalid OFFERSorREQUESTS value provided", {
        OFFERSorREQUESTS,
        requestId,
      });
      return res.status(400).json({ error: "Invalid OFFERSorREQUESTS value" });
    }
    if (typeof securedCredex !== "boolean") {
      logger.warn("Invalid securedCredex value provided", {
        securedCredex,
        requestId,
      });
      return res.status(400).json({ error: "Invalid securedCredex value" });
    }
    if (!securedCredex && !dueDate) {
      logger.warn("dueDate is required for unsecured credex", {
        securedCredex,
        dueDate,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "dueDate is required for unsecured credex" });
    }
    if (securedCredex && dueDate) {
      logger.warn("dueDate is not allowed for secured credex", {
        securedCredex,
        dueDate,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "dueDate is not allowed for secured credex" });
    }

    // Check if issuerAccountID and receiverAccountID are the same
    if (issuerAccountID === receiverAccountID) {
      logger.warn("Issuer and receiver are the same account", {
        issuerAccountID,
        receiverAccountID,
        requestId,
      });
      return res
        .status(400)
        .json({ error: "Issuer and receiver cannot be the same account" });
    }

    // Get member tier
    logger.debug("Fetching member tier", { issuerAccountID, requestId });
    const getMemberTier = await ledgerSpaceSession.run(
      `
        MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
        RETURN member.memberTier as memberTier
      `,
      { issuerAccountID }
    );

    const memberTier = getMemberTier.records[0]?.get("memberTier");
    if (!memberTier) {
      logger.warn("Member tier not found", { issuerAccountID, requestId });
      return res.status(404).json({ error: "Member tier not found" });
    }

    // Check due date for unsecured credex
    if (!securedCredex) {
      logger.debug("Checking due date for unsecured credex", {
        dueDate,
        requestId,
      });
      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logger.warn("Invalid due date", { dueDate, requestId });
        return res.status(400).json({
          error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`,
        });
      }

      // Check if unsecured credex is permitted on membership tier
      if (memberTier == 1) {
        logger.warn("Unauthorized unsecured credex for Open Tier", {
          issuerAccountID,
          memberTier,
          requestId,
        });
        return res.status(400).json({
          error: "Members on the Open Tier cannot issue unsecured credexes",
        });
      }
    }

    // Check secured credex limits based on membership tier
    if (securedCredex) {
      logger.debug("Checking secured credex limits", {
        issuerAccountID,
        requestId,
      });
      logger.debug("Calling AuthForTierSpendLimitController", {
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId,
      });
      const tierAuth = await AuthForTierSpendLimitController(
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId
      );
      if (!tierAuth.isAuthorized) {
        logger.warn("Unauthorized secured credex", {
          issuerAccountID,
          InitialAmount,
          Denomination,
          requestId,
        });
        return res.status(400).json({ error: tierAuth.message });
      }
    }

    // Call OfferCredexService to create the Credex offer
    logger.debug("Calling OfferCredexService", { body: req.body, requestId });
    const offerCredexData = await OfferCredexService(req.body);

    if (!offerCredexData || typeof offerCredexData.credex === "boolean") {
      logger.warn("Failed to create Credex offer", {
        offerCredexData,
        requestId,
      });
      return res.status(400).json({
        error: offerCredexData.message || "Failed to create Credex offer",
      });
    }

    // Fetch updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      memberID,
      issuerAccountID,
      requestId,
    });
    const dashboardData = await GetAccountDashboardService(
      memberID,
      issuerAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        memberID,
        issuerAccountID,
        requestId,
      });
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    // Log successful Credex offer
    logger.info("Credex offer created successfully", {
      credexID: offerCredexData.credex.credexID,
      memberID,
      issuerAccountID,
      receiverAccountID,
      requestId,
    });

    // Return the offer data and updated dashboard data
    return res.status(200).json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logger.error("Unhandled error in OfferCredexController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      requestId,
    });
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    logger.debug("Closing database session", { requestId });
    await ledgerSpaceSession.close();
  }
}
