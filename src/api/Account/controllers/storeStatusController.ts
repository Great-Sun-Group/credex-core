import { Response, NextFunction } from "express";
import { updateStoreStatus } from "../services/UpdateStoreStatus";
import {
  ApiActionType,
  AccountActionDetails,
} from "../../../types/apiResponse";
import { UserRequest } from "../../../types/auth";
import logger from "../../../utils/logger";

/**
 * Controller for updating a store's status and location
 * @param req - Express request object with user authentication
 * @param res - Express response object
 * @param next - Express next function
 */
export async function storeStatusController(
  req: UserRequest,
  res: Response,
  next: NextFunction
) {
  const { storeOpen, location } = req.body;
  const accountID = req.params.accountID;
  const memberID = req.user.memberID;

  logger.info("Store status update request received", {
    memberID,
    accountID,
    storeOpen,
    hasLocation: location !== null && location !== undefined,
    location: JSON.stringify(location),
  });

  try {
    logger.info("Calling updateStoreStatus service", {
      memberID,
      accountID,
      storeOpen,
      location: JSON.stringify(location),
    });
    
    const result = await updateStoreStatus(
      {
        accountID,
        storeOpen,
        location,
      },
      memberID
    );
    
    logger.info("updateStoreStatus service returned", {
      success: result.success,
      message: result.message,
      data: result.data ? JSON.stringify(result.data) : null,
      error: result.error,
    });

    if (!result.success) {
      logger.warn("Store status update failed", {
        memberID,
        accountID,
        error: result.error,
      });

      return res
        .status(result.error?.code ? parseInt(result.error.code) : 500)
        .json({
          message: result.message,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: memberID,
              details: {
                error: result.error,
              },
            },
            dashboard: {},
          },
        });
    }

    logger.info("Store status updated successfully", {
      accountID,
      memberID,
      storeOpen,
      hasLocation: location !== null && location !== undefined,
    });

    // Parse location if it's a string (JSON)
    let locationData = result.data?.location;
    if (typeof locationData === 'string') {
      try {
        locationData = JSON.parse(locationData);
      } catch (e) {
        logger.warn("Failed to parse location data", {
          location: locationData,
          error: e instanceof Error ? e.message : "Unknown error"
        });
      }
    }

    const accountDetails: AccountActionDetails = {
      accountID: accountID,
      storeOpen: result.data?.storeOpen,
      location: locationData || undefined,
    };

    return res.status(200).json({
      message: "Store status updated successfully",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.STORE_STATUS_UPDATED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: accountDetails,
        },
        dashboard: {
          account: {
            accountID: accountID,
            storeOpen: result.data?.storeOpen,
            location: locationData,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Unexpected error in storeStatusController", {
      error: error instanceof Error ? error.message : "Unknown error",
      accountID,
      memberID,
    });

    return next(error);
  }
}
