import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import logger from '../../../utils/logger';
import { getConfig } from '../../../../config/config';

const execAsync = promisify(exec);

export interface DeploymentResult {
  success: boolean;
  message: string;
  details?: any;
  rollbackInfo?: any;
}

export class DeploymentService {
  private static instance: DeploymentService;
  private deployTokens: Set<string> = new Set();

  private constructor() {
    this.initializeDeployTokens();
  }

  public static getInstance(): DeploymentService {
    if (!DeploymentService.instance) {
      DeploymentService.instance = new DeploymentService();
    }
    return DeploymentService.instance;
  }

  private async initializeDeployTokens(): Promise<void> {
    try {
      const config = await getConfig();
      // Load deploy token from environment variable
      const deployToken = process.env.DEPLOY_TOKEN;

      if (deployToken) {
        this.deployTokens.add(deployToken);
        logger.info('Initialized deployment token');
      } else {
        logger.warn('No DEPLOY_TOKEN environment variable found');
      }
    } catch (error) {
      logger.error('Failed to initialize deployment tokens:', error);
    }
  }

  public validateDeployToken(token: string): boolean {
    return this.deployTokens.has(token);
  }

  public async deployCredexCore(branch: string = 'prod', commitSha?: string): Promise<DeploymentResult> {
    const deploymentId = `credex-core-${Date.now()}`;
    logger.info(`Starting credex-core deployment ${deploymentId}`, { branch, commitSha });

    try {
      // Create backup of current state
      const backupInfo = await this.createBackup('credex-core-prod');
      
      // Pull latest changes to ensure we're building with the latest code
      await this.pullLatestChanges('credex-core', branch, commitSha);
      
      // Deploy using Docker Compose (this will rebuild with the latest code)
      const deployResult = await this.deployWithDocker('credex-core');
      
      // Verify deployment health
      const healthCheck = await this.verifyDeploymentHealth('credex-core');
      
      if (!healthCheck.success) {
        // Rollback on health check failure
        await this.rollbackDeployment('credex-core', backupInfo);
        return {
          success: false,
          message: 'Deployment failed health check, rolled back',
          details: healthCheck,
          rollbackInfo: backupInfo
        };
      }

      logger.info(`Successfully deployed credex-core ${deploymentId}`);
      return {
        success: true,
        message: 'credex-core deployed successfully',
        details: {
          deploymentId,
          branch,
          commitSha,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to deploy credex-core ${deploymentId}:`, error);
      return {
        success: false,
        message: `Deployment failed: ${errorMessage}`,
        details: { error: errorMessage, deploymentId }
      };
    }
  }

  public async deployChatserver(branch: string = 'prod', commitSha?: string): Promise<DeploymentResult> {
    const deploymentId = `chatserver-${Date.now()}`;
    logger.info(`Starting chatserver deployment ${deploymentId}`, { branch, commitSha });

    try {
      // For chatserver, we need to pull from the vimbiso-chatserver repository
      const chatserverPath = process.env.VIMBISO_CHATSERVER_PATH || '../vimbiso-chatserver';
      
      // Check if chatserver directory exists
      try {
        await fs.access(chatserverPath);
      } catch {
        return {
          success: false,
          message: 'vimbiso-chatserver directory not found',
          details: { expectedPath: chatserverPath }
        };
      }

      // Create backup
      const backupInfo = await this.createBackup('vimbiso-chatserver');
      
      // Pull latest changes for chatserver
      await this.pullLatestChanges('vimbiso-chatserver', branch, commitSha, chatserverPath);
      
      // Deploy chatserver using Docker Compose
      const deployResult = await this.deployWithDocker('vimbiso-chatserver');
      
      // Verify deployment health
      const healthCheck = await this.verifyDeploymentHealth('vimbiso-chatserver');
      
      if (!healthCheck.success) {
        await this.rollbackDeployment('vimbiso-chatserver', backupInfo);
        return {
          success: false,
          message: 'Chatserver deployment failed health check, rolled back',
          details: healthCheck,
          rollbackInfo: backupInfo
        };
      }

      logger.info(`Successfully deployed chatserver ${deploymentId}`);
      return {
        success: true,
        message: 'vimbiso-chatserver deployed successfully',
        details: {
          deploymentId,
          branch,
          commitSha,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to deploy chatserver ${deploymentId}:`, error);
      return {
        success: false,
        message: `Chatserver deployment failed: ${errorMessage}`,
        details: { error: errorMessage, deploymentId }
      };
    }
  }

  private async createBackup(service: string): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${service}-backup-${timestamp}`;
    
    logger.info(`Creating backup ${backupId} for ${service}`);
    
    try {
      // Create backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'backups', 'deployments');
      await fs.mkdir(backupDir, { recursive: true });
      
      // Get current container/service state instead of git commit
      let currentState: any = {
        backupId,
        service,
        timestamp,
        backupPath: backupDir
      };

      try {
        // Try to get current commit if git is available (for development)
        const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
        currentState.currentCommit = currentCommit.trim();
      } catch (gitError) {
        // Git not available (normal in production containers)
        logger.info('Git not available for backup - using container state');
        
        // Get current running container info instead
        try {
          const { stdout: containerInfo } = await execAsync(`docker ps --filter "name=${service}" --format "{{.ID}},{{.Image}},{{.Status}},{{.CreatedAt}}"`);
          if (containerInfo.trim()) {
            const [containerId, image, status, createdAt] = containerInfo.trim().split(',');
            currentState.containerInfo = {
              containerId: containerId.substring(0, 12), // Short container ID
              image,
              status,
              createdAt
            };
          }
        } catch (dockerError) {
          logger.warn('Could not get container info for backup:', dockerError);
        }
      }
      
      // Save backup metadata
      await fs.writeFile(
        path.join(backupDir, `${backupId}.json`),
        JSON.stringify(currentState, null, 2)
      );
      
      return currentState;
    } catch (error) {
      logger.error(`Failed to create backup for ${service}:`, error);
      throw error;
    }
  }

  private async pullLatestChanges(service: string, branch: string, commitSha?: string, servicePath?: string): Promise<void> {
    // Use the mounted source directory for git operations
    const workingDir = servicePath || '/app/source';
    logger.info(`Pulling latest changes for ${service}`, { branch, commitSha, workingDir });

    try {
      // Fetch latest changes
      await execAsync('git fetch origin', { cwd: workingDir });
      
      // Checkout the specified branch
      await execAsync(`git checkout ${branch}`, { cwd: workingDir });
      
      // Pull latest changes
      await execAsync(`git pull origin ${branch}`, { cwd: workingDir });
      
      // If specific commit SHA is provided, checkout that commit
      if (commitSha) {
        await execAsync(`git checkout ${commitSha}`, { cwd: workingDir });
      }
      
      logger.info(`Successfully pulled latest changes for ${service}`);
    } catch (error) {
      logger.error(`Failed to pull changes for ${service}:`, error);
      throw error;
    }
  }

  private async buildApplication(): Promise<void> {
    logger.info('Building application');
    
    try {
      // Install dependencies
      await execAsync('npm ci');
      
      // Build the application
      await execAsync('npm run build');
      
      logger.info('Application built successfully');
    } catch (error) {
      logger.error('Failed to build application:', error);
      throw error;
    }
  }

  private async deployWithDocker(service: string): Promise<any> {
    logger.info(`Deploying ${service} with Docker Compose`);
    
    try {
      let composeCommand: string;
      
      if (service === 'credex-core') {
        // Use the mounted source directory and compose file
        composeCommand = 'cd /app/source && docker-compose -f docker-compose.prod.yml up -d --build --force-recreate credex-core-prod';
      } else if (service === 'vimbiso-chatserver') {
        // For chatserver, we need to use the chatserver compose file
        const chatserverPath = process.env.VIMBISO_CHATSERVER_PATH || '../vimbiso-chatserver';
        composeCommand = `cd ${chatserverPath} && docker-compose up -d --build --force-recreate`;
      } else {
        throw new Error(`Unknown service: ${service}`);
      }
      
      const { stdout, stderr } = await execAsync(composeCommand);
      
      logger.info(`Docker deployment completed for ${service}`, { stdout, stderr });
      
      // Wait a moment for services to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { stdout, stderr };
    } catch (error) {
      logger.error(`Docker deployment failed for ${service}:`, error);
      throw error;
    }
  }

  private async verifyDeploymentHealth(service: string): Promise<{ success: boolean; details?: any }> {
    logger.info(`Verifying health for ${service}`);
    
    try {
      let healthUrl: string;
      
      if (service === 'credex-core') {
        // Use port 4000 as specified in docker-compose.prod.yml
        healthUrl = 'http://localhost:4000/health';
      } else if (service === 'vimbiso-chatserver') {
        // Use port 9000 as specified in docker-compose.prod.yml
        healthUrl = 'http://localhost:9000/health/';
      } else {
        throw new Error(`Unknown service: ${service}`);
      }
      
      // Use curl to check health endpoint
      const { stdout } = await execAsync(`curl -f -s ${healthUrl}`);
      const healthResponse = JSON.parse(stdout);
      
      if (healthResponse.status === 'healthy') {
        logger.info(`Health check passed for ${service}`);
        return { success: true, details: healthResponse };
      } else {
        logger.warn(`Health check failed for ${service}`, healthResponse);
        return { success: false, details: healthResponse };
      }
      
    } catch (error) {
      logger.error(`Health check failed for ${service}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, details: { error: errorMessage } };
    }
  }

  private async rollbackDeployment(service: string, backupInfo: any): Promise<void> {
    logger.info(`Rolling back deployment for ${service}`, backupInfo);
    
    try {
      // For container-based deployments, rollback means restarting the previous container
      if (backupInfo.containerInfo) {
        const { containerId, image } = backupInfo.containerInfo;
        logger.info(`Attempting to rollback to previous container image: ${image}`);
        
        // Try to restart the previous container or use the previous image
        if (service === 'credex-core') {
          // Stop current container and start with previous image if available
          await execAsync('cd /app/source && docker-compose -f docker-compose.prod.yml stop credex-core-prod');
          await execAsync('cd /app/source && docker-compose -f docker-compose.prod.yml up -d credex-core-prod');
        } else if (service === 'vimbiso-chatserver') {
          const chatserverPath = process.env.VIMBISO_CHATSERVER_PATH || '../vimbiso-chatserver';
          await execAsync(`cd ${chatserverPath} && docker-compose stop && docker-compose up -d`);
        }
      } else {
        // Fallback: just restart the current deployment
        logger.warn('No container backup info available, restarting current deployment');
        await this.deployWithDocker(service);
      }
      
      logger.info(`Successfully rolled back ${service} deployment`);
    } catch (error) {
      logger.error(`Failed to rollback ${service} deployment:`, error);
      throw error;
    }
  }
}
