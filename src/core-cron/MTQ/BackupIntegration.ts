import { exec } from "child_process";
import { promisify } from "util";
import logger from "../../utils/logger";

const execAsync = promisify(exec);

/**
 * Triggers backup after MTQ completion
 * This function is called at the end of successful MTQ processing
 */
export async function triggerPostMTQBackup(): Promise<void> {
  logger.info("Triggering post-MTQ backup");
  
  try {
    // Execute the integrated backup script with post-mtq type
    const { stdout, stderr } = await execAsync('/scripts/integrated-backup.sh post-mtq', {
      timeout: 300000, // 5 minutes timeout
    });
    
    if (stdout) {
      logger.info("Post-MTQ backup output", { output: stdout });
    }
    
    if (stderr) {
      logger.warn("Post-MTQ backup warnings", { warnings: stderr });
    }
    
    logger.info("Post-MTQ backup triggered successfully");
  } catch (error) {
    logger.error("Failed to trigger post-MTQ backup", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw error - backup failure shouldn't fail MTQ
  }
}

/**
 * Checks if backup is safe to run (no critical processes running)
 */
export async function isBackupSafeToRun(): Promise<boolean> {
  try {
    // Check if DCO is running
    const { stdout } = await execAsync(
      'docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password "MATCH (daynode:Daynode {Active: true}) RETURN daynode.DCOrunningNow AS dco"',
      { timeout: 10000 }
    );
    
    // If DCO is running, backup is not safe
    if (stdout.includes('true')) {
      logger.info("DCO is running, backup not safe");
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error("Error checking backup safety", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false; // Err on the side of caution
  }
}

/**
 * Triggers incremental backup of transaction logs only
 * Used for frequent, lightweight backups during active periods
 */
export async function triggerIncrementalBackup(): Promise<void> {
  logger.info("Triggering incremental transaction backup");
  
  try {
    const isSafe = await isBackupSafeToRun();
    if (!isSafe) {
      logger.info("Skipping incremental backup - not safe to run");
      return;
    }
    
    // Create a lightweight backup of just transaction logs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `/backups/incremental/${timestamp}`;
    
    await execAsync(`mkdir -p ${backupDir}`, { timeout: 5000 });
    
    // Export recent transactions only
    await execAsync(`
      docker exec credex-neo4j-ledger-prod cypher-shell -u neo4j -p password \
        "MATCH (credex:Credex)-[r:REDEEMED]->(loop:LoopAnchor) 
         WHERE r.createdAt >= datetime() - duration('PT1H')
         RETURN credex.credexID, r.AmountRedeemed, r.createdAt, loop.loopID
         ORDER BY r.createdAt DESC" > ${backupDir}/hourly_transactions.csv
    `, { timeout: 30000 });
    
    // Backup Redis state
    await execAsync(`
      docker exec vimbiso-redis-state-prod redis-cli BGSAVE &&
      sleep 3 &&
      docker cp vimbiso-redis-state-prod:/data/dump.rdb ${backupDir}/redis_dump.rdb
    `, { timeout: 30000 });
    
    logger.info("Incremental backup completed", { backupDir });
  } catch (error) {
    logger.error("Failed to create incremental backup", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
