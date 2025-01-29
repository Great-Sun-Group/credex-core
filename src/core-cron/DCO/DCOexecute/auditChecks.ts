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
      // Get trust accounts that are audited by Credex Foundation
      MATCH (credexFoundation:Account {accountType: "CREDEX_FOUNDATION"})
            -[:CREDEX_FOUNDATION_AUDITED]->(trust:Account {accountType: "TRUST"})
      
      // Verify trust account only issues in its denomination
      OPTIONAL MATCH (trust)-[:OWES|OFFERS]->(credex:Credex)
      WITH trust,
           COLLECT(DISTINCT credex.Denomination) as usedDenoms,
           trust.defaultDenom as requiredDenom
      WHERE SIZE(usedDenoms) = 0 OR 
            (SIZE(usedDenoms) = 1 AND usedDenoms[0] = requiredDenom)
      
      // Get total amount issued by trust
      OPTIONAL MATCH (trust)-[:OWES|OFFERS]->(issuedCredex:Credex)
      WITH trust,
           trust.defaultDenom as denom,
           SUM(COALESCE(issuedCredex.OutstandingAmount, 0)) as issuedTotal
      
      // Get total amount held in other accounts
      OPTIONAL MATCH (trust)-[:SECURES]->(securedCredex:Credex)
      WHERE securedCredex.Denomination = denom
      
      // Return comparison
      RETURN trust.accountID as auditedAccount,
             denom,
             issuedTotal as securedTotal,
             SUM(COALESCE(securedCredex.OutstandingAmount, 0)) as netBalance,
             ABS(issuedTotal - SUM(COALESCE(securedCredex.OutstandingAmount, 0))) <= 0.001 as matches,
             (issuedTotal - SUM(COALESCE(securedCredex.OutstandingAmount, 0))) as difference
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

    result.records.forEach((record) => {
      const accountId = record.get("auditedAccount");
      const denom = record.get("denom");
      const netBalance = Number(record.get("netBalance"));
      const securedTotal = Number(record.get("securedTotal"));
      const matches = record.get("matches");
      const difference = Number(record.get("difference"));

      // Store absolute values for reporting
      details.totalSecuredBalances[denom] = securedTotal;
      details.totalTrustBalances[denom] = Math.abs(netBalance);

      if (!matches) {
        allMatch = false;
        details.discrepancies![accountId] = {
          secured: securedTotal,
          trust: Math.abs(netBalance),
          difference: difference,
          denomination: denom
        };
      }
    });

    details.matchStatus = allMatch;

    logInfo("Balance audit completed", {
      timestamp: details.timestamp,
      matchStatus: details.matchStatus,
      discrepancies: details.discrepancies,
    });

    return {
      success: true,
      details,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
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
  stage: "PRE_DCO" | "POST_DCO"
): Promise<void> {
  try {
    await session.run(
      `
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
    `,
      {
        timestamp: auditResult.details.timestamp,
        stage,
        checksum: auditResult.details.checksum,
        securedBalances: JSON.stringify(
          auditResult.details.totalSecuredBalances
        ),
        trustBalances: JSON.stringify(auditResult.details.totalTrustBalances),
        matchStatus: auditResult.details.matchStatus,
        discrepancies: JSON.stringify(auditResult.details.discrepancies || {}),
      }
    );

    logInfo("Audit result recorded", {
      timestamp: auditResult.details.timestamp,
      stage,
      matchStatus: auditResult.details.matchStatus,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error recording audit result", err, { stage });

    throw error;
  }
}

/**
 * Performs pre-DCO audit checks
 */
export async function performPreDCOAudit(
  session: Session
): Promise<AuditResult> {
  const auditResult = await verifyBalanceMatch(session);
  await recordAuditResult(session, auditResult, "PRE_DCO");
  return auditResult;
}

/**
 * Performs post-DCO audit checks
 */
export async function performPostDCOAudit(
  session: Session
): Promise<AuditResult> {
  const auditResult = await verifyBalanceMatch(session);
  await recordAuditResult(session, auditResult, "POST_DCO");
  return auditResult;
}

/**
 * Generates a daily audit report for trust accounts
 */
export async function generateDailyAuditReport(
  session: Session
): Promise<string> {
  try {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})<-[:AUDITS]-(audits:DailyAudit)
      RETURN audits
      ORDER BY audits.timestamp
    `);

    const auditRecords = result.records.map(
      (record) => record.get("audits").properties
    );

    // Format report content
    const reportContent = auditRecords
      .map((audit) => {
        const securedBalances = JSON.parse(
          audit.totalSecuredBalances
        ) as Record<string, number>;
        const trustBalances = JSON.parse(audit.totalTrustBalances) as Record<
          string,
          number
        >;
        const discrepancies = JSON.parse(audit.discrepancies) as Record<
          string,
          AuditDiscrepancy
        >;

        return `
Audit Stage: ${audit.stage}
Timestamp: ${audit.timestamp}
System Checksum: ${audit.checksum}
Balance Match Status: ${audit.matchStatus ? "MATCHED" : "DISCREPANCY FOUND"}

Secured Balances:
${Object.entries(securedBalances)
  .map(([denom, amount]) => `  ${denom}: ${amount}`)
  .join("\n")}

Trust Account Balances:
${Object.entries(trustBalances)
  .map(([denom, amount]) => `  ${denom}: ${amount}`)
  .join("\n")}

${
  Object.keys(discrepancies).length > 0
    ? `
Discrepancies Found:
${Object.entries(discrepancies)
  .map(
    ([accountId, values]) => `  Account ${accountId} (${values.denomination}):
    Total Secured Balances Outstanding: ${values.secured}
    Net Trust Account Balance: ${values.trust}
    Balance Discrepancy: ${values.difference}
    Status: ${values.difference === 0 ? "BALANCED" : "MISMATCH"}`
  )
  .join("\n")}`
    : "No Discrepancies Found"
}
-------------------`;
      })
      .join("\n\n");

    // Save report to database
    const reportID = await session.run(
      `
      MATCH (daynode:Daynode {Active: true})
      CREATE (report:AuditReport {
        reportID: randomUUID(),
        timestamp: datetime(),
        content: $content
      })-[:REPORTS_ON]->(daynode)
      RETURN report.reportID as reportID
    `,
      { content: reportContent }
    );

    logInfo("Daily audit report generated", {
      reportID: reportID.records[0].get("reportID"),
      timestamp: new Date().toISOString(),
    });

    return reportContent;
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error generating daily audit report", err);

    throw error;
  }
}
