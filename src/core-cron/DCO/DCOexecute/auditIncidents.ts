import { Session } from "neo4j-driver";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import { logInfo, logError } from "../../../utils/logger";
import { AuditDetails } from "./types";
import { createNeo4jBackup } from "../DBbackup";
import { calculateSystemChecksum } from "./checksum";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";

/**
 * Records an audit incident in the database
 */
export async function recordAuditIncident(
  session: Session,
  incidentType: 'PRE_DCO_AUDIT_FAILURE' | 'POST_DCO_AUDIT_FAILURE',
  auditDetails: AuditDetails
): Promise<void> {
  try {
    await session.run(`
      MATCH (daynode:Daynode {Active: true})
      CREATE (incident:AuditIncident {
        incidentID: $incidentID,
        timestamp: datetime(),
        type: $incidentType,
        checksum: $checksum,
        totalSecuredBalances: $securedBalances,
        totalTrustBalances: $trustBalances,
        discrepancies: $discrepancies,
        status: "UNRESOLVED",
        requiresInvestigation: true
      })-[:INCIDENT_ON]->(daynode)
    `, {
      incidentID: uuidv4(),
      incidentType,
      checksum: auditDetails.checksum,
      securedBalances: JSON.stringify(auditDetails.totalSecuredBalances),
      trustBalances: JSON.stringify(auditDetails.totalTrustBalances),
      discrepancies: JSON.stringify(auditDetails.discrepancies || {})
    });

    // Send immediate notification (implement your notification system here)
    logError(`AUDIT INCIDENT: ${incidentType}`, new Error(incidentType), {
      timestamp: new Date().toISOString(),
      discrepancies: auditDetails.discrepancies
    });

    logInfo("Audit incident recorded", {
      type: incidentType,
      timestamp: new Date().toISOString(),
      checksum: auditDetails.checksum
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Error recording audit incident", err, {
      incidentType,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Validates backup file integrity
 */
async function validateBackupFile(
  filePath: string,
  expectedChecksum?: string
): Promise<boolean> {
  try {
    // Read and parse backup file
    const backupContent = await fs.readFile(filePath, 'utf8');
    const backupData = JSON.parse(backupContent);

    // Verify backup metadata
    if (!backupData.metadata || !backupData.data) {
      throw new Error('Invalid backup file format');
    }

    // Verify checksum if provided
    if (expectedChecksum && backupData.metadata.checksum !== expectedChecksum) {
      throw new Error('Backup file checksum mismatch');
    }

    // Verify data structure
    if (!Array.isArray(backupData.data.nodes) || !Array.isArray(backupData.data.relationships)) {
      throw new Error('Invalid backup data structure');
    }

    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Backup file validation failed", err, { filePath });
    return false;
  }
}

/**
 * Restores database from backup data
 */
async function restoreDatabase(
  session: Session,
  backupData: { nodes: any[], relationships: any[] }
): Promise<void> {
  // Start a transaction for atomic restore
  const tx = session.beginTransaction();
  
  try {
    // Clear existing data
    await tx.run('MATCH (n) DETACH DELETE n');

    // Restore nodes
    for (const node of backupData.nodes) {
      await tx.run(`
        CREATE (n:${node.labels.join(':')} $props)
        SET n = $props
      `, { props: node.properties });
    }

    // Restore relationships
    for (const rel of backupData.relationships) {
      await tx.run(`
        MATCH (start) WHERE id(start) = $startId
        MATCH (end) WHERE id(end) = $endId
        CREATE (start)-[r:${rel.type} $props]->(end)
        SET r = $props
      `, {
        startId: rel.startNode,
        endId: rel.endNode,
        props: rel.properties
      });
    }

    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

/**
 * Verifies restored state
 */
async function verifyRestoredState(
  session: Session,
  expectedChecksum: string
): Promise<boolean> {
  const currentChecksum = await calculateSystemChecksum(session);
  return currentChecksum === expectedChecksum;
}

/**
 * Restores the system from a backup
 */
export async function restoreFromBackup(date: string, suffix: string): Promise<void> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    // First create a backup of current state in case restore fails
    await createNeo4jBackup(date, "_pre_restore");

    const backupsDir = process.env.BACKUPS_DIR || '/var/lib/neo4j/backups';
    const ledgerSpaceBackupPath = `${backupsDir}/${date}_ledgerSpace_dev${suffix}.json`;
    const searchSpaceBackupPath = `${backupsDir}/${date}_searchSpace_dev${suffix}.json`;

    // Validate backup files
    const ledgerSpaceValid = await validateBackupFile(ledgerSpaceBackupPath);
    const searchSpaceValid = await validateBackupFile(searchSpaceBackupPath);

    if (!ledgerSpaceValid || !searchSpaceValid) {
      throw new Error('Backup validation failed');
    }

    // Load backup data
    const ledgerSpaceBackup = JSON.parse(await fs.readFile(ledgerSpaceBackupPath, 'utf8'));
    const searchSpaceBackup = JSON.parse(await fs.readFile(searchSpaceBackupPath, 'utf8'));

    // Restore both databases
    await restoreDatabase(ledgerSpaceSession, ledgerSpaceBackup.data);
    await restoreDatabase(searchSpaceSession, searchSpaceBackup.data);

    // Verify restored state
    const ledgerSpaceVerified = await verifyRestoredState(
      ledgerSpaceSession,
      ledgerSpaceBackup.metadata.checksum
    );
    const searchSpaceVerified = await verifyRestoredState(
      searchSpaceSession,
      searchSpaceBackup.metadata.checksum
    );

    if (!ledgerSpaceVerified || !searchSpaceVerified) {
      throw new Error('Restored state verification failed');
    }

    logInfo("System successfully restored from backup", {
      date,
      suffix,
      ledgerSpaceBackupPath,
      searchSpaceBackupPath,
      ledgerSpaceChecksum: ledgerSpaceBackup.metadata.checksum,
      searchSpaceChecksum: searchSpaceBackup.metadata.checksum
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Error restoring from backup", err, {
      date,
      suffix
    });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

/**
 * Interface for incident notification subscribers
 */
export interface IncidentSubscriber {
  notify(incident: {
    type: string;
    timestamp: string;
    details: AuditDetails;
  }): Promise<void>;
}

// TODO: Implement notification system
// This would handle immediate notifications to relevant parties when incidents occur
// Could include email, SMS, Slack, etc.
