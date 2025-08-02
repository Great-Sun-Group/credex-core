import { Request, Response } from 'express';
import { DeploymentService } from '../services/DeploymentService';
import { ApkService } from '../services/ApkService';
import logger from '../../../utils/logger';

// Extend Request interface to include file property from multer
interface MulterRequest extends Omit<Request, 'file'> {
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}

export class DeploymentController {
  private deploymentService: DeploymentService;
  private apkService: ApkService;

  constructor() {
    this.deploymentService = DeploymentService.getInstance();
    this.apkService = ApkService.getInstance();
  }

  /**
   * Deploy credex-core service
   */
  public deployCore = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    logger.info('Deploy core service request', { requestId, body: req.body });

    try {
      const { service, deploy_token, branch, commit_sha } = req.body;

      // Validate deploy token
      if (!this.deploymentService.validateDeployToken(deploy_token)) {
        res.status(401).json({
          message: 'Invalid deploy token',
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CORE_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'system',
              details: {
                code: 'UNAUTHORIZED',
                reason: 'Invalid deploy token'
              }
            }
          }
        });
        return;
      }

      // Deploy the service
      const result = await this.deploymentService.deployCredexCore(branch);

      if (result.success) {
        res.status(200).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CORE_SUCCESS',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      } else {
        res.status(500).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CORE_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Deploy core service error:', error);
      
      res.status(500).json({
        message: 'Internal server error during deployment',
        data: {
          action: {
            id: requestId,
            type: 'DEPLOY_CORE_ERROR',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'INTERNAL_ERROR',
              reason: errorMessage
            }
          }
        }
      });
    }
  };

  /**
   * Deploy chatserver service
   */
  public deployChatserver = async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    logger.info('Deploy chatserver service request', { requestId, body: req.body });

    try {
      const { service, deploy_token, branch, commit_sha } = req.body;

      // Validate deploy token
      if (!this.deploymentService.validateDeployToken(deploy_token)) {
        res.status(401).json({
          message: 'Invalid deploy token',
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CHATSERVER_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'system',
              details: {
                code: 'UNAUTHORIZED',
                reason: 'Invalid deploy token'
              }
            }
          }
        });
        return;
      }

      // Deploy the service
      const result = await this.deploymentService.deployChatserver(branch, commit_sha);

      if (result.success) {
        res.status(200).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CHATSERVER_SUCCESS',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      } else {
        res.status(500).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'DEPLOY_CHATSERVER_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Deploy chatserver service error:', error);
      
      res.status(500).json({
        message: 'Internal server error during deployment',
        data: {
          action: {
            id: requestId,
            type: 'DEPLOY_CHATSERVER_ERROR',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'INTERNAL_ERROR',
              reason: errorMessage
            }
          }
        }
      });
    }
  };

  /**
   * Upload APK file
   */
  public uploadApk = async (req: MulterRequest, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    logger.info('Upload APK request', { requestId });

    try {
      const { version, update_required, release_notes, deploy_token } = req.body;

      // Validate deploy token
      if (!this.deploymentService.validateDeployToken(deploy_token)) {
        res.status(401).json({
          message: 'Invalid deploy token',
          data: {
            action: {
              id: requestId,
              type: 'UPLOAD_APK_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'system',
              details: {
                code: 'UNAUTHORIZED',
                reason: 'Invalid deploy token'
              }
            }
          }
        });
        return;
      }

      // Check if file was uploaded
      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          message: 'No APK file uploaded',
          data: {
            action: {
              id: requestId,
              type: 'UPLOAD_APK_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'system',
              details: {
                code: 'MISSING_FILE',
                reason: 'APK file is required'
              }
            }
          }
        });
        return;
      }

      // Upload the APK
      const result = await this.apkService.uploadApk(
        req.file.buffer,
        version,
        update_required,
        release_notes
      );

      if (result.success) {
        res.status(200).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'UPLOAD_APK_SUCCESS',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      } else {
        res.status(400).json({
          message: result.message,
          data: {
            action: {
              id: requestId,
              type: 'UPLOAD_APK_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'deployment-system',
              details: result.details
            }
          }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Upload APK error:', error);
      
      res.status(500).json({
        message: 'Internal server error during APK upload',
        data: {
          action: {
            id: requestId,
            type: 'UPLOAD_APK_ERROR',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'INTERNAL_ERROR',
              reason: errorMessage
            }
          }
        }
      });
    }
  };

  /**
   * Serve APK file for download
   */
  public downloadApk = async (req: Request, res: Response): Promise<void> => {
    const { version } = req.params;
    logger.info('Download APK request', { version });

    try {
      const filePath = await this.apkService.getApkPath(version);
      
      if (!filePath) {
        res.status(404).json({
          message: 'APK file not found',
          data: {
            action: {
              id: req.headers['x-request-id'] as string,
              type: 'DOWNLOAD_APK_ERROR',
              timestamp: new Date().toISOString(),
              actor: 'system',
              details: {
                code: 'FILE_NOT_FOUND',
                reason: `APK version ${version || 'latest'} not found`
              }
            }
          }
        });
        return;
      }

      // Set appropriate headers for APK download
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="vimbisopay-${version || 'latest'}.apk"`);
      
      // Send the file
      res.sendFile(filePath);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Download APK error:', error);
      
      res.status(500).json({
        message: 'Internal server error during APK download',
        data: {
          action: {
            id: req.headers['x-request-id'] as string,
            type: 'DOWNLOAD_APK_ERROR',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'INTERNAL_ERROR',
              reason: errorMessage
            }
          }
        }
      });
    }
  };

  // Note: App version checking is maintained in the App module for backward compatibility
  // See src/api/Deployment/BACKWARD_COMPATIBILITY.md for migration strategy
}
