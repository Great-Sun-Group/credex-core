import express from "express";
import { OfferCredexService } from "../services/OfferCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../constants/credspan";
import { AuthForTierSpendLimitController } from "../../Member/controllers/authForTierSpendLimit";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { logError, logInfo } from "../../../utils/logger";
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

    // Validate input
    if (!validateUUID(memberID)) {
      return res.status(400).json({ error: "Invalid memberID" });
    }
    if (!validateUUID(issuerAccountID)) {
      return res.status(400).json({ error: "Invalid issuerAccountID" });
    }
    if (!validateUUID(receiverAccountID)) {
      return res.status(400).json({ error: "Invalid receiverAccountID" });
    }
    if (!validateDenomination(Denomination)) {
      return res.status(400).json({ error: "Invalid Denomination" });
    }
    if (!validateAmount(InitialAmount)) {
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }
    if (!validateCredexType(credexType)) {
      return res.status(400).json({ error: "Invalid credexType" });
    }
    if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
      return res.status(400).json({ error: "Invalid OFFERSorREQUESTS value" });
    }
    if (typeof securedCredex !== "boolean") {
      return res.status(400).json({ error: "Invalid securedCredex value" });
    }
    if (!securedCredex && !dueDate) {
      return res
        .status(400)
        .json({ error: "dueDate is required for unsecured credex" });
    }
    if (securedCredex && dueDate) {
      return res
        .status(400)
        .json({ error: "dueDate is not allowed for secured credex" });
    }

    // Check if issuerAccountID and receiverAccountID are the same
    if (issuerAccountID === receiverAccountID) {
      logError(
        "OfferCredexController: Issuer and receiver are the same account",
        new Error(),
        { issuerAccountID, receiverAccountID }
      );
      return res
        .status(400)
        .json({ error: "Issuer and receiver cannot be the same account" });
    }

    // Check due date for unsecured credex
    if (!securedCredex) {
      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logError("OfferCredexController: Invalid due date", new Error(), {
          dueDate,
        });
        return res.status(400).json({
          error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`,
        });
      }
    }

    // Check secured credex limits based on membership tier
    if (securedCredex) {
      const getMemberTier = await ledgerSpaceSession.run(
        `
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `,
        { issuerAccountID }
      );

      const memberTier = getMemberTier.records[0]?.get("memberTier");
      if (!memberTier) {
        logError("OfferCredexController: Member tier not found", new Error(), {
          issuerAccountID,
        });
        return res.status(404).json({ error: "Member tier not found" });
      }

      const tierAuth = await AuthForTierSpendLimitController(
        issuerAccountID,
        memberTier,
        InitialAmount,
        Denomination
      );
      if (!tierAuth.isAuthorized) {
        logError(
          "OfferCredexController: Unauthorized secured credex",
          new Error(),
          { issuerAccountID, memberTier, InitialAmount, Denomination }
        );
        return res.status(400).json({ error: tierAuth.message });
      }
    }

    // Check if unsecured credex is permitted on membership tier
    if (!securedCredex) {
      const getMemberTier = await ledgerSpaceSession.run(
        `
          MATCH (member:Member)-[:OWNS]->(account:Account { accountID: $issuerAccountID })
          RETURN member.memberTier as memberTier
        `,
        { issuerAccountID }
      );

      const memberTier = getMemberTier.records[0]?.get("memberTier");
      if (!memberTier) {
        logError("OfferCredexController: Member tier not found", new Error(), {
          issuerAccountID,
        });
        return res.status(404).json({ error: "Member tier not found" });
      }

      if (memberTier == 1) {
        logError(
          "OfferCredexController: Unauthorized unsecured credex for Open Tier",
          new Error(),
          { issuerAccountID, memberTier }
        );
        return res
          .status(400)
          .json({
            error: "Members on the Open Tier cannot issue unsecured credexes",
          });
      }
    }

    // Call OfferCredexService to create the Credex offer
    const offerCredexData = await OfferCredexService(req.body);

    if (!offerCredexData || typeof offerCredexData.credex === "boolean") {
      logError(
        "OfferCredexController: Failed to create Credex offer",
        new Error(),
        { offerCredexData }
      );
      return res
        .status(400)
        .json({
          error: offerCredexData.message || "Failed to create Credex offer",
        });
    }

    // Fetch updated dashboard data
    const dashboardData = await GetAccountDashboardService(
      memberID,
      issuerAccountID
    );

    if (!dashboardData) {
      logError(
        "OfferCredexController: Failed to fetch dashboard data",
        new Error(),
        { memberID, issuerAccountID }
      );
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }

    // Log successful Credex offer
    logInfo("OfferCredexController: Credex offer created successfully", {
      credexID: offerCredexData.credex.credexID,
    });

    // Return the offer data and updated dashboard data
    return res.status(200).json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    logError("OfferCredexController: Unhandled error", err as Error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await ledgerSpaceSession.close();
  }
}
