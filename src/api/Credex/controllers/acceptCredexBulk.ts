import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";

/**
 * AcceptCredexBulkController
 *
 * This controller handles the bulk acceptance of multiple Credex offers.
 * It validates the required fields, calls the AcceptCredexService for each Credex,
 * fetches updated dashboard data, and returns the result.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function AcceptCredexBulkController(
  req: express.Request,
  res: express.Response
) {
  const requestId = req.id;
  logger.debug("Entering AcceptCredexBulkController", { requestId });

  const fieldsRequired = ["credexIDs", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      logger.warn(`${field} is required`, { requestId, field });
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  if (
    !Array.isArray(req.body.credexIDs) ||
    !req.body.credexIDs.every(
      (id: any) => typeof id === "string" && validateUUID(id)
    )
  ) {
    logger.warn("Invalid credexIDs", {
      requestId,
      credexIDs: req.body.credexIDs,
    });
    return res.status(400).json({
      message: "Array of valid credexIDs (UUIDs) to accept is required",
    });
  }

  if (!validateUUID(req.body.signerID)) {
    logger.warn("Invalid signerID", { requestId, signerID: req.body.signerID });
    return res
      .status(400)
      .json({ message: "Invalid signerID. Must be a valid UUID." });
  }

  try {
    logger.debug("Starting bulk accept process", {
      requestId,
      credexCount: req.body.credexIDs.length,
    });
    const acceptCredexData = await Promise.all(
      req.body.credexIDs.map(async (credexID: string) => {
        logger.debug("Accepting individual Credex", { requestId, credexID });
        const data = await AcceptCredexService(
          credexID,
          req.body.signerID,
          requestId
        );
        if (data) {
          logger.debug("Credex accepted successfully", { requestId, credexID });
          return data;
        }
        logger.warn("Failed to accept Credex", { requestId, credexID });
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

    logger.debug("Filtered valid Credex data", {
      requestId,
      validCount: validCredexData.length,
      totalCount: acceptCredexData.length,
    });

    if (validCredexData.length > 0) {
      // Assuming that memberID and acceptorAccountID are the same for all returned objects
      const { memberID, acceptorAccountID } = validCredexData[0];

      logger.debug("Fetching dashboard data", {
        requestId,
        memberID,
        acceptorAccountID,
      });
      const dashboardData = await GetAccountDashboardService(
        memberID,
        acceptorAccountID
      );

      if (!dashboardData) {
        logger.error("Failed to fetch dashboard data", {
          error: "GetAccountDashboardService returned null",
          requestId,
          memberID,
          acceptorAccountID,
        });
        return res
          .status(500)
          .json({ error: "Failed to fetch dashboard data" });
      }

      logger.info("Credexes accepted in bulk successfully", {
        count: validCredexData.length,
        requestId,
        memberID,
        acceptorAccountID,
      });
      res.json({
        acceptCredexData: validCredexData,
        dashboardData: dashboardData,
      });
    } else {
      // Handle the case when there are no valid data returned from AcceptCredexService
      logger.warn("No valid data returned from AcceptCredexService", {
        requestId,
        credexIDs: req.body.credexIDs,
      });
      res
        .status(400)
        .json({ error: "No valid data returned from AcceptCredexService" });
    }
  } catch (err) {
    logger.error("Error in AcceptCredexBulkController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      requestId,
    });
    res.status(500).json({ error: "Internal server error" });
  }

  logger.debug("Exiting AcceptCredexBulkController", { requestId });
}
