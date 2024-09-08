import express from "express";
import { OfferCredexService } from "../services/OfferCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../constants/credspan";
import { SecuredCredexAuthForTierController } from "../../Member/controllers/securedCredexAuthForTier";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import {
  validateUUID,
  validateDenomination,
  validateAmount,
  validateCredexType
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
    // Validate required fields
    const fieldsRequired = [
      "memberID",
      "issuerAccountID",
      "receiverAccountID",
      "Denomination",
      "InitialAmount",
      "credexType",
      "OFFERSorREQUESTS",
    ];
    for (const field of fieldsRequired) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    const {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex = false,
      dueDate = "",
    } = req.body;

    // Validate UUIDs
    if (!validateUUID(memberID) || !validateUUID(issuerAccountID) || !validateUUID(receiverAccountID)) {
      return res.status(400).json({ error: "Invalid UUID provided" });
    }

    // Check if issuerAccountID and receiverAccountID are the same
    if (issuerAccountID === receiverAccountID) {
      return res.status(400).json({ error: "Issuer and receiver cannot be the same account" });
    }

    // Validate InitialAmount
    if (!validateAmount(InitialAmount)) {
      return res.status(400).json({ error: "Invalid InitialAmount" });
    }

    // Check denomination validity
    if (!validateDenomination(Denomination)) {
      return res.status(400).json({ error: "Invalid denomination" });
    }

    // Check credex type validity
    if (!validateCredexType(credexType)) {
      return res.status(400).json({ error: "Invalid credex type" });
    }

    // Validate OFFERSorREQUESTS
    if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
      return res.status(400).json({ error: "Invalid OFFER/REQUEST value" });
    }

    // Check due date for unsecured credex
    if (!securedCredex) {
      if (!dueDate) {
        return res.status(400).json({ error: "Unsecured credex must have a due date" });
      }
      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        return res.status(400).json({ 
          error: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.` 
        });
      }
    } else if (dueDate) {
      return res.status(400).json({ error: "Secured credex cannot have a due date" });
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

      const memberTier = getMemberTier.records[0].get("memberTier");
      const tierAuth = await SecuredCredexAuthForTierController(
        issuerAccountID,
        memberTier,
        InitialAmount,
        Denomination
      );
      if (!tierAuth.isAuthorized) {
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

      const memberTier = getMemberTier.records[0].get("memberTier");
      if (memberTier == 1) {
        return res.status(400).json({ error: "Members on the Open Tier cannot issue unsecured credexes" });
      }
    }

    // Call OfferCredexService to create the Credex offer
    const offerCredexData = await OfferCredexService(req.body);
    
    if (!offerCredexData || typeof offerCredexData.credex === 'boolean') {
      return res.status(400).json({ error: offerCredexData.message || "Failed to create Credex offer" });
    }
    
    // Fetch updated dashboard data
    const dashboardData = await GetAccountDashboardService(memberID, issuerAccountID);
    
    if (!dashboardData) {
      return res.status(404).json({ error: "Failed to fetch dashboard data" });
    }
    
    // Return the offer data and updated dashboard data
    return res.status(200).json({
      offerCredexData: offerCredexData,
      dashboardData: dashboardData,
    });
  } catch (err) {
    console.error("Error in OfferCredexController:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await ledgerSpaceSession.close();
  }
}
