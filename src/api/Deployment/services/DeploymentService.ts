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

  public async deployCredexCore(branch: string = 'prod'): Promise<DeploymentResult> {
    const deploymentId = `credex-core-${Date.now()}`;
    logger.info(`Starting credex-core deployment ${deploymentId}`, { branch });

    try {
      // Create backup of current state
      const backupInfo = await this.createBackup('credex-core-prod');
      
      // Pull latest changes to ensure we're building with the latest code
      await this.pullLatestChanges('credex-core', branch);
      
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
      const backupInfo = await this.createBackup('vimbiso-chatserver-prod');
      
      // Pull latest changes for chatserver
      await this.pullLatestChanges('vimbiso-chatserver', branch, chatserverPath);
      
      // Deploy chatserver using Docker Compose from credex-core directory
      const deployResult = await this.deployWithDocker('vimbiso-chatserver');
      
      // Verify deployment health
      const healthCheck = await this.verifyDeploymentHealth('vimbiso-chatserver');
      
      if (!healthCheck.success) {
        await this.rollbackDeployment('vimbiso-chatserver-prod', backupInfo);
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

  private async pullLatestChanges(service: string, branch: string, servicePath?: string): Promise<void> {
    // Create a separate deployment directory to avoid conflicts with development work
    const deploymentDir = `/app/deployment-${service}-${Date.now()}`;
    const sourceDir = servicePath || '/app/source';
    
    logger.info(`Pulling latest changes for ${service}`, { branch, deploymentDir });

    try {
      // Create deployment directory
      await execAsync(`mkdir -p ${deploymentDir}`);
      
      // Clone the repository to the deployment directory
      logger.info(`Cloning repository to deployment directory: ${deploymentDir}`);
      await execAsync(`git clone ${sourceDir} ${deploymentDir}`);
      
      // Fetch and checkout the specified branch in the deployment directory
      await execAsync('git fetch origin', { cwd: deploymentDir });
      await execAsync(`git checkout ${branch}`, { cwd: deploymentDir });
      await execAsync(`git pull origin ${branch}`, { cwd: deploymentDir });
      
      // We always use the latest commit on the specified branch
      logger.info(`Using latest commit on ${branch} branch`);
      
      // Copy environment files that aren't in git
      if (service === 'credex-core') {
        try {
          // Copy .env.prod from the source directory to deployment directory
          await execAsync(`cp ${sourceDir}/.env.prod ${deploymentDir}/.env.prod`);
          logger.info('Copied .env.prod to deployment directory');
        } catch (envError) {
          logger.warn('Could not copy .env.prod file:', envError);
        }
        
        process.env.DEPLOYMENT_SOURCE_DIR = deploymentDir;
      }
      
      logger.info(`Successfully pulled latest changes for ${service} to ${deploymentDir}`);
    } catch (error) {
      logger.error(`Failed to pull changes for ${service}:`, error);
      // Clean up deployment directory on failure
      try {
        await execAsync(`rm -rf ${deploymentDir}`);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup deployment directory: ${deploymentDir}`, cleanupError);
      }
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
    logger.info(`Deploying ${service} with Zero-Downtime Docker strategy`);
    
    try {
      if (service === 'credex-core') {
        return await this.deployCredexCoreZeroDowntime();
      } else if (service === 'vimbiso-chatserver') {
        return await this.deployChatserverDirect();
      } else {
        throw new Error(`Unknown service: ${service}`);
      }
    } catch (error) {
      logger.error(`Docker deployment failed for ${service}:`, error);
      
      // Clean up deployment directory on failure
      if (service === 'credex-core' && process.env.DEPLOYMENT_SOURCE_DIR) {
        try {
          await execAsync(`rm -rf ${process.env.DEPLOYMENT_SOURCE_DIR}`);
          delete process.env.DEPLOYMENT_SOURCE_DIR;
        } catch (cleanupError) {
          logger.warn('Failed to cleanup deployment directory on error:', cleanupError);
        }
      }
      
      throw error;
    }
  }

  private async deployCredexCoreZeroDowntime(): Promise<any> {
    const deploymentDir = process.env.DEPLOYMENT_SOURCE_DIR || '/app/source';
    const newContainerName = 'credex-core-prod-new';
    const currentContainerName = 'credex-core-prod';
    const backupContainerName = 'credex-core-prod-backup';
    
    logger.info('Starting Zero-Downtime deployment for credex-core');
    
    try {
      // Step 1: Ensure network exists
      logger.info('Ensuring Docker network exists');
      try {
        await execAsync('docker network create credex-prod-network');
      } catch (networkError) {
        // Network might already exist, which is fine
        logger.info('Docker network already exists or creation failed (likely already exists)');
      }
      
      // Step 2: Build new image from deployment directory
      const buildCommand = `cd ${deploymentDir} && docker build --target production -t credex-core-deployment:latest .`;
      logger.info('Building credex-core image from deployment directory');
      await execAsync(buildCommand);
      
      // Step 3: Try Blue-Green deployment first, fallback to simple replacement if it fails
      try {
        return await this.attemptBlueGreenDeployment(deploymentDir, newContainerName, currentContainerName, backupContainerName);
      } catch (blueGreenError) {
        logger.warn('Blue-Green deployment failed, falling back to simple replacement:', blueGreenError);
        return await this.attemptSimpleReplacement(deploymentDir, currentContainerName, backupContainerName);
      }
      
    } catch (error) {
      logger.error('All deployment strategies failed:', error);
      
      // Clean up deployment directory on failure
      if (process.env.DEPLOYMENT_SOURCE_DIR) {
        try {
          await execAsync(`rm -rf ${process.env.DEPLOYMENT_SOURCE_DIR}`);
          delete process.env.DEPLOYMENT_SOURCE_DIR;
        } catch (cleanupError) {
          logger.warn('Failed to cleanup deployment directory:', cleanupError);
        }
      }
      
      throw error;
    }
  }

  private async attemptBlueGreenDeployment(deploymentDir: string, newContainerName: string, currentContainerName: string, backupContainerName: string): Promise<any> {
    logger.info('Attempting Blue-Green deployment strategy');
    
    // Step 1: Start new container on different port for testing
    logger.info(`Starting new container for testing: ${newContainerName}`);
    const testRunCommand = `docker run -d \
      --name ${newContainerName} \
      --env-file /app/source/.env.prod \
      -e NODE_ENV=production \
      -e PORT=4000 \
      -e LOG_LEVEL=info \
      -p 4001:4000 \
      -v /app/source/logs/prod:/app/logs \
      -v /app/source/backups/credex-core:/app/backups \
      -v /app/source:/app/source \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /app/source/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro \
      --restart no \
      --network credex-prod-network \
      credex-core-deployment:latest`;
    
    const { stdout: testStdout, stderr: testStderr } = await execAsync(testRunCommand);
    logger.info('Test container started', { stdout: testStdout, stderr: testStderr });
    
    // Step 2: Wait for new container to be ready and perform health check
    logger.info('Waiting for new container to be ready...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Increased wait time
    
    logger.info('Performing health check on new container');
    const healthCheckPassed = await this.performHealthCheck('http://localhost:4001/health', 45000); // Increased timeout
    
    if (!healthCheckPassed) {
      logger.error('Health check failed for new container, cleaning up');
      await execAsync(`docker stop ${newContainerName}`);
      await execAsync(`docker rm ${newContainerName}`);
      throw new Error('New container failed health check');
    }
    
    logger.info('Health check passed for new container');
    
    // Step 3: Stop the test container (we'll start production version)
    await execAsync(`docker stop ${newContainerName}`);
    await execAsync(`docker rm ${newContainerName}`);
    
    // Step 4: Backup current production container if it exists
    logger.info('Backing up current production container');
    try {
      // Check if current container exists
      await execAsync(`docker inspect ${currentContainerName}`);
      // If it exists, rename it for backup
      await execAsync(`docker rename ${currentContainerName} ${backupContainerName}`);
      logger.info('Current container backed up successfully');
    } catch (inspectError) {
      logger.info('No existing production container to backup');
    }
    
    // Step 5: Start new production container
    logger.info('Starting new production container');
    const prodRunCommand = `docker run -d \
      --name ${currentContainerName} \
      --env-file /app/source/.env.prod \
      -e NODE_ENV=production \
      -e PORT=4000 \
      -e LOG_LEVEL=info \
      -p 4000:4000 \
      -v /app/source/logs/prod:/app/logs \
      -v /app/source/backups/credex-core:/app/backups \
      -v /app/source:/app/source \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /app/source/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro \
      --restart unless-stopped \
      --network credex-prod-network \
      credex-core-deployment:latest`;
    
    const { stdout: prodStdout, stderr: prodStderr } = await execAsync(prodRunCommand);
    logger.info('Production container started', { stdout: prodStdout, stderr: prodStderr });
    
    // Step 6: Final health check on production port
    logger.info('Performing final health check on production container');
    await new Promise(resolve => setTimeout(resolve, 10000));
    const finalHealthCheck = await this.performHealthCheck('http://localhost:4000/health', 45000);
    
    if (!finalHealthCheck) {
      logger.error('Final health check failed, attempting rollback');
      await this.rollbackZeroDowntimeDeployment(currentContainerName, backupContainerName);
      throw new Error('Final health check failed, deployment rolled back');
    }
    
    // Step 7: Stop and clean up backup container
    logger.info('Cleaning up backup container');
    try {
      await execAsync(`docker stop ${backupContainerName}`);
      await execAsync(`docker rm ${backupContainerName}`);
      logger.info('Backup container cleaned up');
    } catch (cleanupError) {
      logger.info('No backup container to cleanup or cleanup failed (this is normal for first deployment)');
    }
    
    // Step 8: Clean up deployment directory
    if (process.env.DEPLOYMENT_SOURCE_DIR) {
      try {
        await execAsync(`rm -rf ${process.env.DEPLOYMENT_SOURCE_DIR}`);
        delete process.env.DEPLOYMENT_SOURCE_DIR;
        logger.info('Cleaned up deployment directory');
      } catch (cleanupError) {
        logger.warn('Failed to cleanup deployment directory:', cleanupError);
      }
    }
    
    logger.info('Blue-Green deployment completed successfully');
    return { stdout: prodStdout, stderr: prodStderr };
  }

  private async attemptSimpleReplacement(deploymentDir: string, currentContainerName: string, backupContainerName: string): Promise<any> {
    logger.info('Attempting Simple Replacement deployment strategy');
    
    // Step 1: Backup current production container if it exists
    logger.info('Backing up current production container');
    try {
      // Check if current container exists
      await execAsync(`docker inspect ${currentContainerName}`);
      // If it exists, rename it for backup
      await execAsync(`docker rename ${currentContainerName} ${backupContainerName}`);
      logger.info('Current container backed up successfully');
    } catch (inspectError) {
      logger.info('No existing production container to backup');
    }
    
    // Step 2: Start new production container directly
    logger.info('Starting new production container');
    const prodRunCommand = `docker run -d \
      --name ${currentContainerName} \
      --env-file /app/source/.env.prod \
      -e NODE_ENV=production \
      -e PORT=4000 \
      -e LOG_LEVEL=info \
      -p 4000:4000 \
      -v /app/source/logs/prod:/app/logs \
      -v /app/source/backups/credex-core:/app/backups \
      -v /app/source:/app/source \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /app/source/docker-compose.prod.yml:/app/docker-compose.prod.yml:ro \
      --restart unless-stopped \
      --network credex-prod-network \
      credex-core-deployment:latest`;
    
    const { stdout: prodStdout, stderr: prodStderr } = await execAsync(prodRunCommand);
    logger.info('Production container started', { stdout: prodStdout, stderr: prodStderr });
    
    // Step 3: Health check on production port
    logger.info('Performing health check on production container');
    await new Promise(resolve => setTimeout(resolve, 15000));
    const healthCheck = await this.performHealthCheck('http://localhost:4000/health', 60000); // Longer timeout for simple replacement
    
    if (!healthCheck) {
      logger.error('Health check failed, attempting rollback');
      await this.rollbackZeroDowntimeDeployment(currentContainerName, backupContainerName);
      throw new Error('Simple replacement failed health check, deployment rolled back');
    }
    
    // Step 4: Stop and clean up backup container
    logger.info('Cleaning up backup container');
    try {
      await execAsync(`docker stop ${backupContainerName}`);
      await execAsync(`docker rm ${backupContainerName}`);
      logger.info('Backup container cleaned up');
    } catch (cleanupError) {
      logger.info('No backup container to cleanup or cleanup failed (this is normal for first deployment)');
    }
    
    // Step 5: Clean up deployment directory
    if (process.env.DEPLOYMENT_SOURCE_DIR) {
      try {
        await execAsync(`rm -rf ${process.env.DEPLOYMENT_SOURCE_DIR}`);
        delete process.env.DEPLOYMENT_SOURCE_DIR;
        logger.info('Cleaned up deployment directory');
      } catch (cleanupError) {
        logger.warn('Failed to cleanup deployment directory:', cleanupError);
      }
    }
    
    logger.info('Simple Replacement deployment completed successfully');
    return { stdout: prodStdout, stderr: prodStderr };
  }

  private async deployChatserverDirect(): Promise<any> {
    logger.info('Deploying chatserver with direct Docker commands');
    
    try {
      // For chatserver, we'll need to build from the vimbiso-chatserver directory
      const chatserverPath = process.env.VIMBISO_CHATSERVER_PATH || '../vimbiso-chatserver';
      
      // Build chatserver image
      const buildCommand = `cd ${chatserverPath} && docker build --target production -t vimbiso-chatserver-deployment:latest .`;
      logger.info('Building vimbiso-chatserver image');
      await execAsync(buildCommand);
      
      // Stop current chatserver container
      try {
        await execAsync('docker stop vimbiso-chatserver-prod');
        await execAsync('docker rm vimbiso-chatserver-prod');
      } catch (stopError) {
        logger.warn('Failed to stop existing chatserver container (may not exist):', stopError);
      }
      
      // Start new chatserver container
      const runCommand = `docker run -d \
        --name vimbiso-chatserver-prod \
        --env-file /app/source/.env.prod \
        -e REDIS_URL=redis://redis-state-prod:6379/0 \
        -e USE_PROGRESSIVE_FLOW=True \
        -e PORT=9000 \
        -p 9000:9000 \
        -v vimbiso-prod-data:/app/data \
        -v /app/source/backups/vimbiso:/app/backups \
        --restart unless-stopped \
        --network credex-prod-network \
        vimbiso-chatserver-deployment:latest \
        bash -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:9000 --workers 2 --timeout 120"`;
      
      const { stdout, stderr } = await execAsync(runCommand);
      
      logger.info('Chatserver deployment completed', { stdout, stderr });
      
      // Wait a moment for service to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { stdout, stderr };
      
    } catch (error) {
      logger.error('Chatserver deployment failed:', error);
      throw error;
    }
  }

  private async performHealthCheck(url: string, timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const maxRetries = Math.floor(timeoutMs / 2000); // Check every 2 seconds
    
    logger.info(`Starting health check for ${url} with ${maxRetries} retries over ${timeoutMs}ms`);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(`Health check attempt ${i + 1}/${maxRetries} for ${url}`);
        
        // Try wget first (available in most containers), then curl as fallback
        let stdout = '';
        let healthCheckSuccess = false;
        
        try {
          const wgetResult = await execAsync(`wget -q -O - --timeout=5 ${url}`);
          stdout = wgetResult.stdout;
          healthCheckSuccess = true;
        } catch (wgetError) {
          logger.debug('wget failed, trying curl:', wgetError);
          try {
            const curlResult = await execAsync(`curl -f -s --max-time 5 ${url}`);
            stdout = curlResult.stdout;
            healthCheckSuccess = true;
          } catch (curlError) {
            logger.debug('curl also failed:', curlError);
            // Both wget and curl failed, but let's check if the container is responding via docker exec
            try {
              // Try to get the container name dynamically from the URL
              const containerName = url.includes('4001') ? 'credex-core-prod-new' : 'credex-core-prod';
              const dockerExecResult = await execAsync(`docker exec ${containerName} wget -q -O - --timeout=5 http://localhost:4000/health`);
              stdout = dockerExecResult.stdout;
              healthCheckSuccess = true;
              logger.info(`Health check succeeded via docker exec on ${containerName}`);
            } catch (dockerExecError) {
              logger.warn('All health check methods failed:', dockerExecError);
              
              // If we're checking port 4001 (test container), also check if the app is actually starting
              if (url.includes('4001')) {
                try {
                  const { stdout: containerLogs } = await execAsync('docker logs --tail 5 credex-core-prod-new');
                  if (containerLogs.includes('Server running') || containerLogs.includes('listening') || containerLogs.includes('started')) {
                    logger.info('Container appears to be starting based on logs, but health endpoint not ready yet');
                  } else if (containerLogs.includes('Error') || containerLogs.includes('failed') || containerLogs.includes('EADDRINUSE')) {
                    logger.error('Container has errors in logs:', containerLogs);
                    return false; // Fail fast if there are obvious errors
                  }
                } catch (logError) {
                  logger.warn('Could not check container logs:', logError);
                }
              }
            }
          }
        }
        
        if (healthCheckSuccess && stdout.trim()) {
          try {
            const healthResponse = JSON.parse(stdout);
            logger.info(`Health check response:`, healthResponse);
            
            if (healthResponse.status === 'healthy') {
              logger.info(`Health check passed for ${url}`);
              return true;
            }
          } catch (parseError) {
            logger.warn(`Failed to parse health response as JSON: ${stdout}`);
            // If it's not JSON but we got a response, it might still be healthy
            if (stdout.includes('healthy') || stdout.includes('ok')) {
              logger.info(`Health check passed for ${url} (non-JSON response)`);
              return true;
            }
          }
        }
        
        logger.warn(`Health check attempt ${i + 1} failed - no valid response from ${url}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Health check attempt ${i + 1} failed for ${url}: ${errorMessage}`);
        
        // Check if container is even running and get debug info
        if (i === 0 || i === 5) { // Check on first attempt and every 5th attempt
          try {
            const { stdout: containerStatus } = await execAsync('docker ps --filter "name=credex-core-prod-new" --format "{{.Status}}"');
            logger.info(`Container status: ${containerStatus.trim() || 'Not found'}`);
            
            // Check container logs for debugging
            const { stdout: containerLogs } = await execAsync('docker logs --tail 10 credex-core-prod-new');
            logger.info(`Container logs (last 10 lines): ${containerLogs}`);
            
            // Check if the container is actually listening on port 4000
            const { stdout: portCheck } = await execAsync('docker exec credex-core-prod-new netstat -tlnp | grep :4000 || echo "Port 4000 not found"');
            logger.info(`Port check: ${portCheck.trim()}`);
            
          } catch (debugError) {
            logger.warn('Failed to get container debug info:', debugError);
          }
        }
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we've exceeded timeout
      if (Date.now() - startTime > timeoutMs) {
        break;
      }
    }
    
    logger.error(`Health check failed for ${url} after ${timeoutMs}ms and ${maxRetries} attempts`);
    return false;
  }

  private async rollbackZeroDowntimeDeployment(currentContainerName: string, backupContainerName: string): Promise<void> {
    logger.info('Performing Zero-Downtime deployment rollback');
    
    try {
      // Stop current (failed) container
      try {
        await execAsync(`docker stop ${currentContainerName}`);
        await execAsync(`docker rm ${currentContainerName}`);
      } catch (stopError) {
        logger.warn('Failed to stop current container during rollback:', stopError);
      }
      
      // Restore backup container
      try {
        await execAsync(`docker rename ${backupContainerName} ${currentContainerName}`);
        await execAsync(`docker start ${currentContainerName}`);
        logger.info('Successfully rolled back to previous container');
      } catch (rollbackError) {
        logger.error('Failed to rollback to previous container:', rollbackError);
        throw rollbackError;
      }
      
    } catch (error) {
      logger.error('Rollback failed:', error);
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
        } else if (service === 'vimbiso-chatserver-prod') {
          // Use the unified docker-compose.prod.yml for chatserver rollback as well
          await execAsync('cd /app/source && docker-compose -f docker-compose.prod.yml stop vimbiso-chatserver-prod');
          await execAsync('cd /app/source && docker-compose -f docker-compose.prod.yml up -d vimbiso-chatserver-prod');
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

  private async cleanupConflictingContainers(containerNames: string[]): Promise<void> {
    logger.info('Cleaning up potentially conflicting containers', { containerNames });
    
    for (const containerName of containerNames) {
      try {
        // Check if container exists
        await execAsync(`docker inspect ${containerName}`);
        
        // If it exists, stop and remove it
        logger.info(`Removing conflicting container: ${containerName}`);
        await execAsync(`docker stop ${containerName}`);
        await execAsync(`docker rm ${containerName}`);
        logger.info(`Successfully removed conflicting container: ${containerName}`);
      } catch (error) {
        // Container doesn't exist or already removed, which is fine
        logger.debug(`Container ${containerName} doesn't exist or already removed`);
      }
    }
  }

  private async safeContainerCleanup(containerName: string): Promise<void> {
    try {
      logger.info(`Safely cleaning up container: ${containerName}`);
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
      logger.info(`Successfully cleaned up container: ${containerName}`);
    } catch (error) {
      logger.warn(`Failed to cleanup container ${containerName}:`, error);
    }
  }

  private async safeContainerBackup(currentContainerName: string, backupContainerName: string): Promise<boolean> {
    try {
      // Check if current container exists
      await execAsync(`docker inspect ${currentContainerName}`);
      
      // Clean up any existing backup container first
      await this.safeContainerCleanup(backupContainerName);
      
      // Rename current container to backup
      await execAsync(`docker rename ${currentContainerName} ${backupContainerName}`);
      logger.info(`Successfully backed up container ${currentContainerName} to ${backupContainerName}`);
      return true;
    } catch (inspectError) {
      logger.info(`No existing container ${currentContainerName} to backup`);
      return false;
    }
  }
}
