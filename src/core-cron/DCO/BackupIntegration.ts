import { exec } from "child_process";
import { promisify } from "util";
import logger from "../../utils/logger";

const execAsync = promisify(exec);

/**
 * Triggers pre-DCO backup to create a safety snapshot before DCO starts
 * This ensures we have a clean restore point if DCO fails
 */
export async function triggerPreDCOBackup(): Promise<void> {
  logger.info("Triggering pre-DCO backup");
  
  try {
    // Execute the integrated backup script with pre-dco type
    const { stdout, stderr } = await execAsync('/scripts/integrated-backup.sh pre-dco', {
      timeout: 600000, // 10 minutes timeout for full backup
    });
    
    if (stdout) {
      logger.info("Pre-DCO backup output", { output: stdout });
    }
    
    if (stderr) {
      logger.warn("Pre-DCO backup warnings", { warnings: stderr });
    }
    
    logger.info("Pre-DCO backup completed successfully");
  } catch (error) {
    logger.error("Failed to trigger pre-DCO backup", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw error - backup failure shouldn't prevent DCO
  }
}

/**
 * Triggers post-DCO backup to capture the results of DCO processing
 * This includes exchange rates, new credcoins, and updated database state
 */
export async function triggerPostDCOBackup(): Promise<void> {
  logger.info("Triggering post-DCO backup");
  
  try {
    // Execute the integrated backup script with post-dco type
    const { stdout, stderr } = await execAsync('/scripts/integrated-backup.sh post-dco', {
      timeout: 600000, // 10 minutes timeout for full backup
    });
    
    if (stdout) {
      logger.info("Post-DCO backup output", { output: stdout });
    }
    
    if (stderr) {
      logger.warn("Post-DCO backup warnings", { warnings: stderr });
    }
    
    logger.info("Post-DCO backup completed successfully");
  } catch (error) {
    logger.error("Failed to trigger post-DCO backup", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw error - backup failure shouldn't fail DCO
  }
}

/**
 * Triggers maintenance backup during the daily maintenance window
 * This is the most comprehensive backup with full system shutdown capabilities
 */
export async function triggerMaintenanceBackup(): Promise<void> {
  logger.info("Triggering maintenance backup");
  
  try {
    // Execute the integrated backup script with maintenance type
    const { stdout, stderr } = await execAsync('/scripts/integrated-backup.sh maintenance', {
      timeout: 1800000, // 30 minutes timeout for maintenance backup
    });
    
    if (stdout) {
      logger.info("Maintenance backup output", { output: stdout });
    }
    
    if (stderr) {
      logger.warn("Maintenance backup warnings", { warnings: stderr });
    }
    
    logger.info("Maintenance backup completed successfully");
  } catch (error) {
    logger.error("Failed to trigger maintenance backup", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Maintenance backup failure should be escalated
  }
}

/**
 * Backs up exchange rate data immediately after fetching
 * This ensures we don't lose critical exchange rate information
 */
export async function backupExchangeRateData(rates: any[]): Promise<void> {
  logger.info("Backing up exchange rate data", { ratesCount: rates.length });
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `/backups/exchange-rates/${timestamp}`;
    
    await execAsync(`mkdir -p ${backupDir}`, { timeout: 5000 });
    
    // Save raw exchange rate data as JSON
    const ratesJson = JSON.stringify(rates, null, 2);
    await execAsync(`echo '${ratesJson}' > ${backupDir}/rates.json`, { timeout: 5000 });
    
    // Also save to database if possible
    if (rates.length > 0) {
      const rateInserts = rates.map(rate => 
        `CREATE (rate:ExchangeRate {
          currency: '${rate.currency}',
          bid: '${rate.bid}',
          ask: '${rate.ask}',
          avg: '${rate.avg}',
          fetchedAt: datetime()
        })`
      ).join('\n');
      
      await execAsync(`
        docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password "
          ${rateInserts}
        "
      `, { timeout: 30000 });
    }
    
    logger.info("Exchange rate data backed up successfully", { backupDir });
  } catch (error) {
    logger.error("Failed to backup exchange rate data", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - this shouldn't stop DCO
  }
}

/**
 * Performs system maintenance tasks during the daily maintenance window
 * This includes cleanup, optimization, and system health checks
 */
export async function performSystemMaintenance(): Promise<void> {
  logger.info("Starting system maintenance tasks");
  
  try {
    // Docker system cleanup
    logger.info("Performing Docker cleanup");
    await execAsync('docker system prune -f --volumes', { timeout: 300000 });
    
    // Neo4j database optimization
    logger.info("Optimizing Neo4j databases");
    await execAsync(`
      docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password "
        CALL db.stats.retrieve('GRAPH COUNTS');
        CALL gds.graph.list();
      "
    `, { timeout: 60000 });
    
    // Check disk space and alert if low
    const { stdout: diskUsage } = await execAsync('df -h /', { timeout: 10000 });
    logger.info("Disk usage check", { diskUsage });
    
    // Check memory usage
    const { stdout: memUsage } = await execAsync('free -h', { timeout: 10000 });
    logger.info("Memory usage check", { memUsage });
    
    // Rotate logs if they're getting large
    await execAsync(`
      find /app/logs -name "*.log" -size +100M -exec truncate -s 50M {} \\;
    `, { timeout: 30000 });
    
    logger.info("System maintenance completed successfully");
  } catch (error) {
    logger.error("Error during system maintenance", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - maintenance issues shouldn't stop DCO
  }
}

/**
 * Schedules the daily maintenance window
 * This function should be called during DCO to schedule maintenance for midnight UTC
 */
export async function scheduleMaintenanceWindow(): Promise<void> {
  logger.info("Scheduling daily maintenance window");
  
  try {
    // Calculate time until next midnight UTC
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0); // Next midnight UTC
    
    const msUntilMaintenance = nextMidnight.getTime() - now.getTime();
    
    logger.info("Maintenance window scheduled", {
      currentTime: now.toISOString(),
      nextMaintenance: nextMidnight.toISOString(),
      msUntilMaintenance
    });
    
    // Schedule maintenance (this would typically be handled by a cron job)
    // For now, just log the schedule
    logger.info(`Maintenance window will begin in ${Math.round(msUntilMaintenance / 1000 / 60 / 60)} hours`);
    
  } catch (error) {
    logger.error("Error scheduling maintenance window", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
