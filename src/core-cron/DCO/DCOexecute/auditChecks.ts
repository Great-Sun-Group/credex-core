import { Session } from "neo4j-driver";
import { logInfo, logError } from "../../../utils/logger";
import { calculateSystemChecksum } from "./checksum";

import { AuditResult, AuditDetails, AuditDiscrepancy } from "./types";

/**
 * Verifies that secured balances match trust account balances for each denomination
 */
async function verifyBalanceMatch(session: Session): Promise<AuditResult> {
  try {
    const result = await session.run(`
      // Get total secured balances by denomination
      MATCH (account:Account)
      WHERE account.accountType = "SECURED"
      WITH account
      MATCH (account)-[secured:SECURED]->(credex:Credex)
      WHERE credex.OutstandingAmount > 0
      WITH credex.Denomination as denom, sum(credex.OutstandingAmount) as securedTotal
      
      // Get total trust account balances by denomination
      WITH denom, securedTotal
      MATCH (trust:Account {accountType: "CREDEX_FOUNDATION_AUDITED"})
      WITH denom, securedTotal, trust
      MATCH (trust)-[held:HOLDS]->(asset:Asset)
      WHERE asset.Denomination = denom
      WITH denom, securedTotal, sum(asset.Amount) as trustTotal
      
      RETURN denom, securedTotal, trustTotal,
             securedTotal = trustTotal as matches,
             abs(securedTotal - trustTotal) as difference
    `);

    const details: AuditDetails = {
      timestamp: new Date().toISOString(),
      checksum: await calculateSystemChecksum(session),
      totalSecuredBalances: {},
      totalTrustBalances: {},
      matchStatus: true,
      discrepancies: {}
    };

    let allMatch = true;

    result.records.forEach(record => {
      const denom = record.get('denom');
      const securedTotal = record.get('securedTotal').toNumber();
      const trustTotal = record.get('trustTotal').toNumber();
      const matches = record.get('matches');
      const difference = record.get('difference').toNumber();

      details.totalSecuredBalances[denom] = securedTotal;
      details.totalTrustBalances[denom] = trustTotal;

      if (!matches) {
        allMatch = false;
        details.discrepancies![denom] = {
          secured: securedTotal as number,
          trust: trustTotal as number,
          difference: difference as number
        };
      }
    });

    details.matchStatus = allMatch;

    logInfo("Balance audit completed", {
      timestamp: details.timestamp,
      matchStatus: details.matchStatus,
      discrepancies: details.discrepancies
    });

    return {
      success: true,
      details
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Error during balance audit", err);

    throw error;
  }
}

/**
 * Records the audit result in the database
 */
async function recordAuditResult(
  session: Session, 
  auditResult: AuditResult,
  stage: 'PRE_DCO' | 'POST_DCO'
): Promise<void> {
  try {
    await session.run(`
      MATCH (daynode:Daynode {Active: true})
      CREATE (audit:DailyAudit {
        auditID: randomUUID(),
        timestamp: $timestamp,
        stage: $stage,
        checksum: $checksum,
        totalSecuredBalances: $securedBalances,
        totalTrustBalances: $trustBalances,
        matchStatus: $matchStatus,
        discrepancies: $discrepancies
      })-[:AUDITS]->(daynode)
    `, {
      timestamp: auditResult.details.timestamp,
      stage,
      checksum: auditResult.details.checksum,
      securedBalances: JSON.stringify(auditResult.details.totalSecuredBalances),
      trustBalances: JSON.stringify(auditResult.details.totalTrustBalances),
      matchStatus: auditResult.details.matchStatus,
      discrepancies: JSON.stringify(auditResult.details.discrepancies || {})
    });

    logInfo("Audit result recorded", {
      timestamp: auditResult.details.timestamp,
      stage,
      matchStatus: auditResult.details.matchStatus
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Error recording audit result", err, { stage });

    throw error;
  }
}

/**
 * Performs pre-DCO audit checks
 */
export async function performPreDCOAudit(session: Session): Promise<AuditResult> {
  const auditResult = await verifyBalanceMatch(session);
  await recordAuditResult(session, auditResult, 'PRE_DCO');
  return auditResult;
}

/**
 * Performs post-DCO audit checks
 */
export async function performPostDCOAudit(session: Session): Promise<AuditResult> {
  const auditResult = await verifyBalanceMatch(session);
  await recordAuditResult(session, auditResult, 'POST_DCO');
  return auditResult;
}

/**
 * Generates a daily audit report for trust accounts
 */
export async function generateDailyAuditReport(session: Session): Promise<string> {
  try {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})<-[:AUDITS]-(audits:DailyAudit)
      RETURN audits
      ORDER BY audits.timestamp
    `);

    const auditRecords = result.records.map(record => record.get('audits').properties);
    
    // Format report content
    const reportContent = auditRecords.map(audit => {
      const securedBalances = JSON.parse(audit.totalSecuredBalances) as Record<string, number>;
      const trustBalances = JSON.parse(audit.totalTrustBalances) as Record<string, number>;
      const discrepancies = JSON.parse(audit.discrepancies) as Record<string, AuditDiscrepancy>;

      return `
Audit Stage: ${audit.stage}
Timestamp: ${audit.timestamp}
System Checksum: ${audit.checksum}
Balance Match Status: ${audit.matchStatus ? 'MATCHED' : 'DISCREPANCY FOUND'}

Secured Balances:
${Object.entries(securedBalances)
  .map(([denom, amount]) => `  ${denom}: ${amount}`)
  .join('\n')}

Trust Account Balances:
${Object.entries(trustBalances)
  .map(([denom, amount]) => `  ${denom}: ${amount}`)
  .join('\n')}

${Object.keys(discrepancies).length > 0 ? `
Discrepancies Found:
${Object.entries(discrepancies)
  .map(([denom, values]) => `  ${denom}:
    Secured: ${values.secured}
    Trust: ${values.trust}
    Difference: ${values.difference}`)
  .join('\n')}` : 'No Discrepancies Found'}
-------------------`;
    }).join('\n\n');

    // Save report to database
    const reportID = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      CREATE (report:AuditReport {
        reportID: randomUUID(),
        timestamp: datetime(),
        content: $content
      })-[:REPORTS_ON]->(daynode)
      RETURN report.reportID as reportID
    `, { content: reportContent });

    logInfo("Daily audit report generated", {
      reportID: reportID.records[0].get('reportID'),
      timestamp: new Date().toISOString()
    });

    return reportContent;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logError("Error generating daily audit report", err);

    throw error;
  }
}
