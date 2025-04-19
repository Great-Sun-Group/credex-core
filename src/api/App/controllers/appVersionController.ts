import { Request, Response, NextFunction } from 'express';
import { AppVersionService } from '../services/appVersionService';
import logger from "../../../utils/logger";
import { handleServiceError } from "../../../utils/errorUtils";
import { 
  TypedApiResponse, 
  ApiActionType,
  AppActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Define response types
type VersionCheckResponse = TypedApiResponse<AppActionDetails>;
type VersionCheckErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AppVersionController
 * 
 * Handles requests to check for app updates.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AppVersionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AppVersionController", { requestId });

  try {
    const { app_id, current_version, device_info, user_info } = req.body;
    
    // Validate request
    if (!app_id || !current_version) {
      logger.warn("Invalid request - Missing required parameters", {
        app_id,
        current_version,
        requestId
      });
      
      const errorResponse: VersionCheckErrorResponse = {
        message: "Missing required parameters: app_id or current_version",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_REQUEST",
              reason: "Missing required parameters: app_id or current_version"
            }
          },
          dashboard: {}
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    logger.info("Checking for app updates", {
      app_id,
      current_version,
      requestId
    });
    
    const updateInfo = await AppVersionService({
      app_id,
      current_version,
      device_info,
      user_info
    });
    
    if (!updateInfo.update_available) {
      logger.info("No updates available", {
        app_id,
        current_version,
        requestId
      });
      
      const response: VersionCheckResponse = {
        message: "No updates available",
        data: {
          action: {
            id: app_id,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              update_available: false
            }
          },
          dashboard: {}
        }
      };
      
      res.status(200).json(response);
      return;
    }
    
    logger.info("Update available", {
      app_id,
      current_version,
      latest_version: updateInfo.latest_version,
      update_required: updateInfo.update_required,
      requestId
    });
    
    const response: VersionCheckResponse = {
      message: updateInfo.update_required ? 
        "Update required" : 
        "Update available",
      data: {
        action: {
          id: app_id,
          type: ApiActionType.APP_VERSION_CHECK,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            update_available: true,
            latest_version: updateInfo.latest_version,
            update_required: updateInfo.update_required,
            update_priority: updateInfo.update_priority,
            update_type: updateInfo.update_type,
            update_url: updateInfo.update_url,
            file_size_bytes: updateInfo.file_size_bytes,
            release_notes: updateInfo.release_notes,
            release_date: updateInfo.release_date,
            integrity: updateInfo.integrity,
            architecture_specific_downloads: updateInfo.architecture_specific_downloads
          }
        },
        dashboard: {}
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in AppVersionController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });
    
    const errorResponse: VersionCheckErrorResponse = {
      message: "An error occurred while checking for updates",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: String(handledError.code || "UNKNOWN_ERROR"),
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };
    
    res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting AppVersionController", { requestId });
  }
}
