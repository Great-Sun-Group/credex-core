import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { validateUUID } from "../../../utils/validators";
import logger from "../../../utils/logger";
import { v4 as uuidv4 } from 'uuid';

// Import the UserRequest interface from authentication module
import type { Request } from "express";
interface UserRequest extends Request {
  user?: any;
}

type AcceptedResult = {
  status: 'accepted';
  credexID: string;
  data: any;
};

type FailedResult = {
  status: 'failed';
  credexID: string;
  error: string;
};

type AlreadyAcceptedResult = {
  status: 'already_accepted';
  credexID: string;
};

type ErrorResult = {
  status: 'error';
  credexID: string;
  error: string;
};

type CredexResult = AcceptedResult | FailedResult | AlreadyAcceptedResult | ErrorResult;

/**
 * AcceptCredexBulkController
 *
 * This controller handles the bulk acceptance of multiple Credex offers.
 * It validates the required fields, calls the AcceptCredexService for each Credex,
 * fetches updated dashboard data, and returns the result.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 */
export async function AcceptCredexBulkController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const parentRequestId = req.id;
  logger.debug("Entering AcceptCredexBulkController", { parentRequestId });

  // Get signerID from authenticated user
  const signerID = req.user?.memberID;
  if (!signerID) {
    logger.warn("No authenticated user found", { parentRequestId });
    return res.status(401).json({ message: "Authentication required" });
  }

  // Validate required fields
  const { credexIDs } = req.body;
  if (!credexIDs) {
    logger.warn("credexIDs is required", { parentRequestId });
    return res.status(400).json({ message: "credexIDs is required" });
  }

  // Validate credexIDs array
  if (
    !Array.isArray(credexIDs) ||
    !credexIDs.every(
      (id: any) => typeof id === "string" && validateUUID(id)
    )
  ) {
    logger.warn("Invalid credexIDs", {
      parentRequestId,
      credexIDs,
    });
    return res.status(400).json({
      message: "Array of valid credexIDs (UUIDs) to accept is required",
    });
  }

  try {
    logger.debug("Starting bulk accept process", {
      parentRequestId,
      credexCount: credexIDs.length,
    });

    const results = await Promise.all(
      credexIDs.map(async (credexID: string) => {
        const childRequestId = `${parentRequestId}-${uuidv4()}`;
        logger.debug("Processing individual Credex", { parentRequestId, childRequestId, credexID });
        
        try {
          const data = await AcceptCredexService(
            credexID,
            signerID,
            childRequestId
          );
          
          if (data) {
            logger.debug("Credex accepted successfully", { parentRequestId, childRequestId, credexID });
            return {
              status: 'accepted' as const,
              credexID,
              data
            };
          }
          
          logger.warn("Failed to accept Credex", { parentRequestId, childRequestId, credexID });
          return {
            status: 'failed' as const,
            credexID,
            error: 'Failed to accept credex'
          };
        } catch (error) {
          const errorMessage = (error as Error).message;
          
          // Handle already accepted credex gracefully
          if (errorMessage.includes('already accepted')) {
            logger.info("Credex was already accepted", { parentRequestId, childRequestId, credexID });
            return {
              status: 'already_accepted' as const,
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
            status: 'error' as const,
            credexID,
            error: errorMessage
          };
        }
      })
    );

    // Filter successful acceptances
    const acceptedCredex = results.filter(
      (result): result is AcceptedResult => result.status === 'accepted'
    );

    // Group other results for reporting
    const alreadyAccepted = results.filter((result): result is AlreadyAcceptedResult => result.status === 'already_accepted');
    const failed = results.filter((result): result is FailedResult | ErrorResult => 
      result.status === 'failed' || result.status === 'error'
    );

    logger.debug("Processed all credex", {
      parentRequestId,
      accepted: acceptedCredex.length,
      alreadyAccepted: alreadyAccepted.length,
      failed: failed.length
    });

    if (acceptedCredex.length > 0 || alreadyAccepted.length > 0) {
      // Get dashboard data if any credex were processed successfully
      const firstAccepted = acceptedCredex[0]?.data;
      const acceptorAccountID = firstAccepted?.acceptorAccountID;

      logger.debug("Fetching dashboard data", {
        parentRequestId,
        memberID: signerID,
        acceptorAccountID,
      });

      const dashboardData = acceptorAccountID ? 
        await GetAccountDashboardService(signerID, acceptorAccountID) :
        null;

      logger.info("Bulk accept operation completed", {
        accepted: acceptedCredex.length,
        alreadyAccepted: alreadyAccepted.length,
        failed: failed.length,
        parentRequestId
      });

      return res.json({
        success: true,
        data: {
          summary: {
            accepted: acceptedCredex.map(r => r.credexID),
            alreadyAccepted: alreadyAccepted.map(r => r.credexID),
            failed: failed.map(r => ({ credexID: r.credexID, error: r.error }))
          },
          acceptCredexData: acceptedCredex.map(r => r.data),
          dashboardData
        },
        message: "Bulk accept operation completed"
      });
    } else {
      // If nothing was processed successfully
      logger.warn("No credex were processed successfully", {
        parentRequestId,
        failedCount: failed.length,
        errors: failed.map(f => f.error)
      });
      return res.status(400).json({ 
        success: false,
        error: "No credex were processed successfully",
        details: failed.map(f => ({ credexID: f.credexID, error: f.error }))
      });
    }
  } catch (err) {
    logger.error("Error in AcceptCredexBulkController", {
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      parentRequestId,
    });
    next(err);
  }

  logger.debug("Exiting AcceptCredexBulkController", { parentRequestId });
}
