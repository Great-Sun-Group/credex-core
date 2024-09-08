import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../../config/logger";

export async function AcceptCredexBulkController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;

  const fieldsRequired = ["credexIDs", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      logger.warn(`${field} is required`, { requestId });
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  if (
    !Array.isArray(req.body.credexIDs) ||
    !req.body.credexIDs.every(
      (id: any) => typeof id === "string" && validateUUID(id)
    )
  ) {
    logger.warn("Invalid credexIDs", { requestId });
    return res.status(400).json({
      message: "Array of valid credexIDs (UUIDs) to accept is required",
    });
  }

  if (!validateUUID(req.body.signerID)) {
    logger.warn("Invalid signerID", { requestId });
    return res.status(400).json({ message: "Invalid signerID. Must be a valid UUID." });
  }

  try {
    const acceptCredexData = await Promise.all(
      req.body.credexIDs.map(async (credexID: string) => {
        const data = await AcceptCredexService(credexID, req.body.signerID, requestId);
        if (data) {
          return data;
        }
        return null;
      })
    );

    // Filter out any null values
    const validCredexData = acceptCredexData.filter(
      (
        item
      ): item is {
        acceptedCredexID: any;
        acceptorAccountID: any;
        memberID: any;
      } => item !== null
    );

    if (validCredexData.length > 0) {
      // Assuming that memberID and acceptorAccountID are the same for all returned objects
      const { memberID, acceptorAccountID } = validCredexData[0];

      const dashboardData = await GetAccountDashboardService(memberID, acceptorAccountID);

      if (!dashboardData) {
        logger.error("Failed to fetch dashboard data", { error: "GetAccountDashboardService returned null", requestId });
        return res.status(500).json({ error: "Failed to fetch dashboard data" });
      }

      logger.info("Credexes accepted in bulk successfully", { count: validCredexData.length, requestId });
      res.json({
        acceptCredexData: validCredexData,
        dashboardData: dashboardData,
      });
    } else {
      // Handle the case when there are no valid data returned from AcceptCredexService
      logger.warn("No valid data returned from AcceptCredexService", { requestId });
      res.status(400).json({ error: "No valid data returned from AcceptCredexService" });
    }
  } catch (err) {
    logger.error("Error in AcceptCredexBulkController", { error: (err as Error).message, requestId });
    res.status(500).json({ error: "Internal server error" });
  }
}
