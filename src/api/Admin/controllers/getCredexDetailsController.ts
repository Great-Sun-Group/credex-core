import { Request, Response, NextFunction } from "express";
import GetCredexService from "../services/GetCredexService";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface CustomRequest extends Request {
  id: string;
}

export async function getCredexDetailsController(
  req: CustomRequest,
  res: Response,
  next: NextFunction
) {
  const credexID = req.body.credexID;
  const requestId = req.id;

  logger.debug("getCredexDetails controller called", { requestId, credexID });
  
  if (!credexID || !validateUUID(credexID)) {
    logger.warn("Invalid credexID provided", { requestId, credexID });
    return next(new AdminError("Invalid credexID", "INVALID_ID", ErrorCodes.Admin.INVALID_ID));
  }

  try {
    const result = await GetCredexService(credexID);

    if (!result.data || !result.data.length) {
      logger.warn("Credex not found", { requestId, credexID });
      return next(new AdminError("Credex not found", "NOT_FOUND", ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info("Credex details retrieved successfully", { requestId, credexID });
    
    res.status(200).json({
      success: true,
      message: "Credex details fetched successfully",
      data: {
        credexID: result.data[0].credexID,
        credexInfo: {
          type: result.data[0].credexType,
          denomination: result.data[0].credexDenomination,
          amount: result.data[0].credexInitialAmount,
          status: result.data[0].credexQueueStatus,
          secured: !!result.data[0].securerAccountID,
          securerID: result.data[0].securerAccountID
        },
        relationships: {
          issuerID: result.data[0].issuerAccountID,
          receiverID: result.data[0].acceptorAccountID
        }
      }
    });
  } catch (error) {
    logger.error("Error in getCredexDetails controller", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      credexID
    });
    next(new AdminError("Error fetching credex details", "INTERNAL_ERROR", ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
