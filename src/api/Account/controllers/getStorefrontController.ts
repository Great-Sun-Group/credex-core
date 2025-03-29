import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { GetStorefrontService } from "../services/GetStorefront";
import { ApiActionType } from "../../../types/apiResponse";

/**
 * Controller for retrieving storefront information
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetStorefrontController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  const { accountID } = req.params;
  const memberID = req.user?.memberID;

  logger.debug("Entering GetStorefrontController", {
    accountID,
    requestId,
  });

  if (!memberID) {
    logger.warn("User ID not found in request", { accountID, requestId });

    res.status(401).json({
      message: "Authentication required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "NO_AUTH",
            reason: "User not authenticated",
          },
        },
        dashboard: {},
      },
    });
    return;
  }

  try {
    logger.info("Retrieving storefront information", {
      accountID,
      memberID,
      requestId,
    });
    logger.debug("Calling GetStorefrontService", { accountID, requestId });

    const result = await GetStorefrontService(accountID);

    logger.debug("GetStorefrontService returned", {
      accountID,
      requestId,
      success: result.success,
      errorCode: result.error?.code,
    });

    if (!result.success) {
      logger.warn("Failed to retrieve storefront information", {
        accountID,
        error: result.error,
        requestId,
      });

      const statusCode = result.error?.code === "ACCOUNT_NOT_FOUND" ? 404 : 500;
      const errorType =
        result.error?.code === "ACCOUNT_NOT_FOUND"
          ? ApiActionType.ERROR_NOT_FOUND
          : ApiActionType.ERROR_INTERNAL;

      res.status(statusCode).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: result.error?.code || "UNKNOWN_ERROR",
              reason: result.message,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    logger.info("Storefront information retrieved successfully", {
      accountID,
      memberID,
      requestId,
    });

    // Format the store details for the response
    const storeDetails = {
      storeID: result.data!.store.accountID,
      storeName: result.data!.store.accountName,
      storeHandle: result.data!.store.accountHandle,
      storeDescription: result.data!.store.accountDescription,
      storeOpen: result.data!.store.storeOpen,
      location: result.data!.store.location,
      profilePictureUrls: result.data!.store.profilePictureUrls,
    };

    res.status(200).json({
      message: "Storefront information retrieved successfully",
      data: {
        action: {
          id: accountID,
          type: "STOREFRONT_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            storeName: result.data!.store.accountName,
          },
        },
        dashboard: {
          store: storeDetails,
          products: result.data!.products,
          vendor: result.data!.vendor,
        },
      },
    });

    logger.debug("Exiting GetStorefrontController successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in GetStorefrontController", {
      controller: "GetStorefrontController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      requestId,
    });

    res.status(500).json({
      message: "Internal server error while retrieving storefront information",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID || "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        },
        dashboard: {},
      },
    });

    next(error);
  }
}
