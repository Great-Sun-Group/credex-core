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
      const backupInfo = await this.createBackup('credex-core');
      
      // Pull latest changes
      await this.pullLatestChanges('credex-core', branch, commitSha);
      
      // Build the application
      await this.buildApplication();
      
      // Deploy using Docker Compose
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
      
      // For now, we'll just record the current commit SHA as backup info
      const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
      
      const backupInfo = {
        backupId,
        service,
        timestamp,
        currentCommit: currentCommit.trim(),
        backupPath: backupDir
      };
      
      // Save backup metadata
      await fs.writeFile(
        path.join(backupDir, `${backupId}.json`),
        JSON.stringify(backupInfo, null, 2)
      );
      
      return backupInfo;
    } catch (error) {
      logger.error(`Failed to create backup for ${service}:`, error);
      throw error;
    }
  }

  private async pullLatestChanges(service: string, branch: string, commitSha?: string, servicePath?: string): Promise<void> {
    const workingDir = servicePath || process.cwd();
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
        // Rebuild and restart the credex-core service
        composeCommand = 'docker-compose up -d --build --force-recreate server';
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
        const port = process.env.PORT || '3000';
        healthUrl = `http://localhost:${port}/health`;
      } else if (service === 'vimbiso-chatserver') {
        const chatserverPort = process.env.CHATSERVER_PORT || '3001';
        healthUrl = `http://localhost:${chatserverPort}/health`;
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
      // Checkout the previous commit
      if (backupInfo.currentCommit) {
        await execAsync(`git checkout ${backupInfo.currentCommit}`);
      }
      
      // Rebuild and redeploy
      if (service === 'credex-core') {
        await this.buildApplication();
      }
      
      await this.deployWithDocker(service);
      
      logger.info(`Successfully rolled back ${service} deployment`);
    } catch (error) {
      logger.error(`Failed to rollback ${service} deployment:`, error);
      throw error;
    }
  }
}
