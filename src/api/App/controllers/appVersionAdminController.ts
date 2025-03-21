import { Request, Response, NextFunction } from 'express';
import { appVersionRepository } from '../repositories/appVersionRepository';
import logger from "../../../utils/logger";
import { handleServiceError } from "../../../utils/errorUtils";
import { 
  TypedApiResponse, 
  ApiActionType,
  ErrorActionDetails
} from "../../../types/apiResponse";
import { AppVersion, AppVersionCreateInput, AppVersionUpdateInput } from '../models/appVersion';

// Define response types
interface AppVersionActionDetails {
  id: string;
  appId: string;
  platform: string;
  version: string;
  active: boolean;
  [key: string]: any;
}

type AppVersionResponse = TypedApiResponse<AppVersionActionDetails>;
type AppVersionListResponse = TypedApiResponse<{ versions: AppVersionActionDetails[] }>;
type AppVersionErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AppVersionAdminController
 * 
 * Handles admin requests for managing app versions.
 */
export class AppVersionAdminController {
  /**
   * Create a new app version
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async createAppVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.id;
    logger.debug("Entering createAppVersion", { requestId });

    try {
      const input: AppVersionCreateInput = req.body;
      
      // Validate request
      if (!input.appId || !input.platform || !input.version || !input.minRequiredVersion || 
          !input.updateUrl || !input.releaseNotes || !input.releaseDate) {
        logger.warn("Invalid request - Missing required parameters", { requestId });
        
        const errorResponse: AppVersionErrorResponse = {
          message: "Missing required parameters",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "INVALID_REQUEST",
                reason: "Missing required parameters: appId, platform, version, minRequiredVersion, updateUrl, releaseNotes, releaseDate"
              }
            },
            dashboard: {}
          }
        };
        
        res.status(400).json(errorResponse);
        return;
      }
      
      // Create app version
      const appVersion = await appVersionRepository.createAppVersion(input);
      
      logger.info("App version created", {
        id: appVersion.id,
        appId: appVersion.appId,
        platform: appVersion.platform,
        version: appVersion.version,
        requestId
      });
      
      const response: AppVersionResponse = {
        message: "App version created successfully",
        data: {
          action: {
            id: appVersion.id,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              id: appVersion.id,
              appId: appVersion.appId,
              platform: appVersion.platform,
              version: appVersion.version,
              minRequiredVersion: appVersion.minRequiredVersion,
              updateUrl: appVersion.updateUrl,
              fileSizeBytes: appVersion.fileSizeBytes,
              releaseNotes: appVersion.releaseNotes,
              releaseDate: appVersion.releaseDate,
              updatePriority: appVersion.updatePriority,
              updateType: appVersion.updateType,
              active: appVersion.active,
              createdAt: appVersion.createdAt,
              updatedAt: appVersion.updatedAt
            }
          },
          dashboard: {}
        }
      };
      
      res.status(201).json(response);
    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in createAppVersion", {
        error: handledError.message,
        code: handledError.code,
        stack: handledError instanceof Error ? handledError.stack : undefined,
        requestId
      });
      
      const errorResponse: AppVersionErrorResponse = {
        message: "An error occurred while creating app version",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
      logger.debug("Exiting createAppVersion", { requestId });
    }
  }

  /**
   * Get an app version by ID
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async getAppVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.id;
    logger.debug("Entering getAppVersion", { requestId });

    try {
      const { id } = req.params;
      
      // Get app version
      const appVersion = await appVersionRepository.getAppVersionById(id);
      
      if (!appVersion) {
        logger.info("App version not found", { id, requestId });
        
        const errorResponse: AppVersionErrorResponse = {
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${id} not found`
              }
            },
            dashboard: {}
          }
        };
        
        res.status(404).json(errorResponse);
        return;
      }
      
      logger.info("App version found", { id, requestId });
      
      const response: AppVersionResponse = {
        message: "App version found",
        data: {
          action: {
            id: appVersion.id,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              id: appVersion.id,
              appId: appVersion.appId,
              platform: appVersion.platform,
              version: appVersion.version,
              minRequiredVersion: appVersion.minRequiredVersion,
              updateUrl: appVersion.updateUrl,
              fileSizeBytes: appVersion.fileSizeBytes,
              releaseNotes: appVersion.releaseNotes,
              releaseDate: appVersion.releaseDate,
              updatePriority: appVersion.updatePriority,
              updateType: appVersion.updateType,
              active: appVersion.active,
              createdAt: appVersion.createdAt,
              updatedAt: appVersion.updatedAt
            }
          },
          dashboard: {}
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in getAppVersion", {
        error: handledError.message,
        code: handledError.code,
        stack: handledError instanceof Error ? handledError.stack : undefined,
        requestId
      });
      
      const errorResponse: AppVersionErrorResponse = {
        message: "An error occurred while getting app version",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
      logger.debug("Exiting getAppVersion", { requestId });
    }
  }

  /**
   * Get all app versions for an app
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async getAppVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.id;
    logger.debug("Entering getAppVersions", { requestId });

    try {
      const { appId } = req.params;
      
      // Get app versions
      const appVersions = await appVersionRepository.getAppVersions(appId);
      
      logger.info("App versions found", { appId, count: appVersions.length, requestId });
      
      const response: AppVersionListResponse = {
        message: "App versions found",
        data: {
          action: {
            id: appId,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              versions: appVersions.map(v => ({
                id: v.id,
                appId: v.appId,
                platform: v.platform,
                version: v.version,
                minRequiredVersion: v.minRequiredVersion,
                updateUrl: v.updateUrl,
                fileSizeBytes: v.fileSizeBytes,
                releaseNotes: v.releaseNotes,
                releaseDate: v.releaseDate,
                updatePriority: v.updatePriority,
                updateType: v.updateType,
                active: v.active,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt
              }))
            }
          },
          dashboard: {}
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in getAppVersions", {
        error: handledError.message,
        code: handledError.code,
        stack: handledError instanceof Error ? handledError.stack : undefined,
        requestId
      });
      
      const errorResponse: AppVersionErrorResponse = {
        message: "An error occurred while getting app versions",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
      logger.debug("Exiting getAppVersions", { requestId });
    }
  }

  /**
   * Update an app version
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async updateAppVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.id;
    logger.debug("Entering updateAppVersion", { requestId });

    try {
      const { id } = req.params;
      const input: AppVersionUpdateInput = req.body;
      
      // Update app version
      const appVersion = await appVersionRepository.updateAppVersion(id, input);
      
      if (!appVersion) {
        logger.info("App version not found for update", { id, requestId });
        
        const errorResponse: AppVersionErrorResponse = {
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${id} not found`
              }
            },
            dashboard: {}
          }
        };
        
        res.status(404).json(errorResponse);
        return;
      }
      
      logger.info("App version updated", { id, requestId });
      
      const response: AppVersionResponse = {
        message: "App version updated successfully",
        data: {
          action: {
            id: appVersion.id,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              id: appVersion.id,
              appId: appVersion.appId,
              platform: appVersion.platform,
              version: appVersion.version,
              minRequiredVersion: appVersion.minRequiredVersion,
              updateUrl: appVersion.updateUrl,
              fileSizeBytes: appVersion.fileSizeBytes,
              releaseNotes: appVersion.releaseNotes,
              releaseDate: appVersion.releaseDate,
              updatePriority: appVersion.updatePriority,
              updateType: appVersion.updateType,
              active: appVersion.active,
              createdAt: appVersion.createdAt,
              updatedAt: appVersion.updatedAt
            }
          },
          dashboard: {}
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in updateAppVersion", {
        error: handledError.message,
        code: handledError.code,
        stack: handledError instanceof Error ? handledError.stack : undefined,
        requestId
      });
      
      const errorResponse: AppVersionErrorResponse = {
        message: "An error occurred while updating app version",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
      logger.debug("Exiting updateAppVersion", { requestId });
    }
  }

  /**
   * Delete an app version
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public async deleteAppVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = req.id;
    logger.debug("Entering deleteAppVersion", { requestId });

    try {
      const { id } = req.params;
      
      // Delete app version
      const deleted = await appVersionRepository.deleteAppVersion(id);
      
      if (!deleted) {
        logger.info("App version not found for deletion", { id, requestId });
        
        const errorResponse: AppVersionErrorResponse = {
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${id} not found`
              }
            },
            dashboard: {}
          }
        };
        
        res.status(404).json(errorResponse);
        return;
      }
      
      logger.info("App version deleted", { id, requestId });
      
      const response: TypedApiResponse<{ id: string }> = {
        message: "App version deleted successfully",
        data: {
          action: {
            id,
            type: ApiActionType.APP_VERSION_CHECK,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              id
            }
          },
          dashboard: {}
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      const handledError = handleServiceError(error);
      logger.error("Error in deleteAppVersion", {
        error: handledError.message,
        code: handledError.code,
        stack: handledError instanceof Error ? handledError.stack : undefined,
        requestId
      });
      
      const errorResponse: AppVersionErrorResponse = {
        message: "An error occurred while deleting app version",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
      logger.debug("Exiting deleteAppVersion", { requestId });
    }
  }
}

export const appVersionAdminController = new AppVersionAdminController();
