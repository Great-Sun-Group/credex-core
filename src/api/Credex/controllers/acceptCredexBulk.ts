import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";
import { v4 as uuidv4 } from 'uuid';

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
  const parentRequestId = req.id;
  logger.debug("Entering AcceptCredexBulkController", { parentRequestId });

  const fieldsRequired = ["credexIDs", "signerID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      logger.warn(`${field} is required`, { parentRequestId, field });
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
      parentRequestId,
      credexIDs: req.body.credexIDs,
    });
    return res.status(400).json({
      message: "Array of valid credexIDs (UUIDs) to accept is required",
    });
  }

  if (!validateUUID(req.body.signerID)) {
    logger.warn("Invalid signerID", { parentRequestId, signerID: req.body.signerID });
    return res
      .status(400)
      .json({ message: "Invalid signerID. Must be a valid UUID." });
  }

  try {
    logger.debug("Starting bulk accept process", {
      parentRequestId,
      credexCount: req.body.credexIDs.length,
    });

    const results = await Promise.all(
      req.body.credexIDs.map(async (credexID: string) => {
        const childRequestId = `${parentRequestId}-${uuidv4()}`;
        logger.debug("Processing individual Credex", { parentRequestId, childRequestId, credexID });
        
        try {
          const data = await AcceptCredexService(
            credexID,
            req.body.signerID,
            childRequestId
          );
          
          if (data) {
            logger.debug("Credex accepted successfully", { parentRequestId, childRequestId, credexID });
            return {
              status: 'accepted',
              credexID,
              data
            };
          }
          
          logger.warn("Failed to accept Credex", { parentRequestId, childRequestId, credexID });
          return {
            status: 'failed',
            credexID,
            error: 'Failed to accept credex'
          };
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // Handle already accepted credex gracefully
          if (errorMessage.includes('already accepted')) {
            logger.info("Credex was already accepted", { parentRequestId, childRequestId, credexID });
            return {
              status: 'already_accepted',
              credexID
            };
          }
          
          logger.error("Error accepting credex", {
            error: errorMessage,
            parentRequestId,
            childRequestId,
            credexID
          });
          return {
            status: 'error',
            credexID,
            error: errorMessage
          };
        }
      })
    );

    // Filter successful acceptances
    const acceptedCredex = results.filter(
      (result): result is { status: 'accepted', credexID: string, data: any } => 
        result.status === 'accepted'
    );

    // Group other results for reporting
    const alreadyAccepted = results.filter(result => result.status === 'already_accepted');
    const failed = results.filter(result => result.status === 'failed' || result.status === 'error');

    logger.debug("Processed all credex", {
      parentRequestId,
      accepted: acceptedCredex.length,
      alreadyAccepted: alreadyAccepted.length,
      failed: failed.length
    });

    if (acceptedCredex.length > 0 || alreadyAccepted.length > 0) {
      // Get dashboard data if any credex were processed successfully
      const firstAccepted = acceptedCredex[0]?.data;
      const memberID = firstAccepted?.memberID || req.body.signerID;
      const acceptorAccountID = firstAccepted?.acceptorAccountID;

      logger.debug("Fetching dashboard data", {
        parentRequestId,
        memberID,
        acceptorAccountID,
      });

      const dashboardData = acceptorAccountID ? 
        await GetAccountDashboardService(memberID, acceptorAccountID) :
        null;

      logger.info("Bulk accept operation completed", {
        accepted: acceptedCredex.length,
        alreadyAccepted: alreadyAccepted.length,
        failed: failed.length,
        parentRequestId
      });

      res.json({
        summary: {
          accepted: acceptedCredex.map(r => r.credexID),
          alreadyAccepted: alreadyAccepted.map(r => r.credexID),
          failed: failed.map(r => ({ credexID: r.credexID, error: r.error }))
        },
        acceptCredexData: acceptedCredex.map(r => r.data),
        dashboardData: dashboardData
      });
    } else {
      // If nothing was processed successfully
      logger.warn("No credex were processed successfully", {
        parentRequestId,
        failedCount: failed.length,
        errors: failed.map(f => f.error)
      });
      res.status(400).json({ 
        error: "No credex were processed successfully",
        details: failed.map(f => ({ credexID: f.credexID, error: f.error }))
      });
    }
  } catch (err) {
    logger.error("Error in AcceptCredexBulkController", {
      error: (err as Error).message,
      stack: (err as Error).stack,
      parentRequestId,
    });
    res.status(500).json({ error: "Internal server error" });
  }

  logger.debug("Exiting AcceptCredexBulkController", { parentRequestId });
}
