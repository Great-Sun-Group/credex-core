import { Session } from "neo4j-driver";
import { logInfo, logError } from "../../../utils/logger";
import { calculateSystemChecksum } from "./checksum";

import {
  AuditResult,
  AuditDetails,
  AuditDiscrepancy,
  ClaimDetail,
  TrustAccountAuditDetails,
} from "./types";

/**
 * Verifies that secured balances match trust account balances for each denomination
 */
async function verifyBalanceMatch(session: Session): Promise<AuditResult> {
  try {
    // First check for any trust accounts issuing in wrong denomination
    const denomCheck = await session.run(`
      MATCH (trust:Account {accountType: "TRUST"})
      MATCH (trust)-[r:OWES|OFFERS]->(credex:Credex)<-[:SECURES]-(trust)
      WHERE credex.Denomination <> trust.defaultDenom
      RETURN trust.accountID as accountID, trust.defaultDenom as defaultDenom, 
             collect(credex.Denomination) as wrongDenoms
    `);

    if (denomCheck.records.length > 0) {
      const violations = denomCheck.records.map(record => ({
        accountID: record.get('accountID'),
        defaultDenom: record.get('defaultDenom'),
        wrongDenoms: record.get('wrongDenoms')
      }));

      const error = new Error("Trust account denomination violation");
      logError("Trust account denomination violation", error, { violations });
      
      return {
        success: false,
        details: {
          timestamp: new Date().toISOString(),
          checksum: await calculateSystemChecksum(session),
          matchStatus: false,
          discrepancies: violations.reduce((acc, v) => ({
            ...acc,
            [v.accountID]: {
              trustAccountIssuedTotal: 0,
              totalNetClaimed: 0,
              difference: 0,
              denomination: v.defaultDenom,
              claimDetails: [],
              error: `Trust account issuing in wrong denominations: ${v.wrongDenoms.join(', ')}`
            }
          }), {}),
          trustAccounts: []
        }
      };
    }

    // If denomination check passes, proceed with balance verification
    const result = await session.run(`
      MATCH (trust:Account {accountType: "TRUST"})
      
      // Get total issued by trust (we know it's all in their defaultDenom)
      OPTIONAL MATCH (trust)-[r:OWES|OFFERS]->(credex:Credex)<-[:SECURES]-(trust)
      WITH trust, COALESCE(SUM(credex.OutstandingAmount), 0) as trustAccountIssuedTotal
      
      // Get balance claims on the trust account
      OPTIONAL MATCH (claimingAccount:Account)<-[r:OWES|OFFERS]-(securedIncomingCredex:Credex)<-[:SECURES]-(trust)
      WITH trust, trustAccountIssuedTotal, claimingAccount, COALESCE(SUM(securedIncomingCredex.OutstandingAmount), 0) as grossBalanceClaimed

      // All uncleared credex secured by the trust account that emanate from these accounts
      OPTIONAL MATCH (claimingAccount)-[]->(securedOutgoingCredex:Credex)<-[:SECURES]-(trust)
      WITH trust, trustAccountIssuedTotal, claimingAccount, grossBalanceClaimed, COALESCE(SUM(securedOutgoingCredex.OutstandingAmount), 0) as issuedAgainstClaims
      
      RETURN trust, trustAccountIssuedTotal, claimingAccount.accountID, grossBalanceClaimed - issuedAgainstClaims as netClaimed
    `);

    const details: AuditDetails = {
      timestamp: new Date().toISOString(),
      checksum: await calculateSystemChecksum(session),
      matchStatus: true,
      discrepancies: {},
      trustAccounts: [],
    };

    // Group records by trust account to collect all claims
    const trustAccountMap = new Map<
      string,
      {
        trust: any;
        trustAccountIssuedTotal: number;
        claims: ClaimDetail[];
      }
    >();

    result.records.forEach((record) => {
      const trust = record.get("trust");
      const trustAccountIssuedTotal = Number(
        record.get("trustAccountIssuedTotal")
      );
      const claimingAccountId = record.get("claimingAccount.accountID");
      const netClaimed = Number(record.get("netClaimed"));

      let trustData = trustAccountMap.get(trust.accountID);
      if (!trustData) {
        trustData = {
          trust,
          trustAccountIssuedTotal,
          claims: [],
        };
        trustAccountMap.set(trust.accountID, trustData);
      }

      if (claimingAccountId) {
        trustData.claims.push({
          accountID: claimingAccountId,
          netClaimed,
        });
      }
    });

    // Process each trust account
    for (const [accountId, trustData] of trustAccountMap) {
      const totalNetClaimed = trustData.claims.reduce(
        (sum, claim) => sum + claim.netClaimed,
        0
      );

      const trustAccountDetails = {
        accountID: accountId,
        defaultDenom: trustData.trust.defaultDenom,
        trustAccountIssuedTotal: trustData.trustAccountIssuedTotal,
        claimDetails: trustData.claims,
        totalNetClaimed,
      };

      details.trustAccounts.push(trustAccountDetails);

      if (
        Math.abs(trustData.trustAccountIssuedTotal - totalNetClaimed) > 0.001
      ) {
        details.matchStatus = false;
        details.discrepancies![accountId] = {
          trustAccountIssuedTotal: trustData.trustAccountIssuedTotal,
          totalNetClaimed,
          difference: trustData.trustAccountIssuedTotal - totalNetClaimed,
          denomination: trustData.trust.defaultDenom,
          claimDetails: trustData.claims,
        };
      }
    }

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
        matchStatus: $matchStatus,
        discrepancies: $discrepancies,
        trustAccounts: $trustAccounts
      })-[:AUDITS]->(daynode)
    `,
      {
        timestamp: auditResult.details.timestamp,
        stage,
        checksum: auditResult.details.checksum,
        matchStatus: auditResult.details.matchStatus,
        discrepancies: JSON.stringify(auditResult.details.discrepancies || {}),
        trustAccounts: JSON.stringify(auditResult.details.trustAccounts),
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
        const trustAccounts = JSON.parse(
          audit.trustAccounts
        ) as TrustAccountAuditDetails[];
        const discrepancies = JSON.parse(audit.discrepancies) as Record<
          string,
          AuditDiscrepancy
        >;

        return `
Audit Stage: ${audit.stage}
Timestamp: ${audit.timestamp}
System Checksum: ${audit.checksum}
Balance Match Status: ${audit.matchStatus ? "MATCHED" : "DISCREPANCY FOUND"}

Trust Account Details:
${trustAccounts
  .map(
    (account) => `
  Account ID: ${account.accountID} (${account.defaultDenom})
  Total Issued: ${account.trustAccountIssuedTotal}
  Total Net Claimed: ${account.totalNetClaimed}
  
  Claim Details:
  ${account.claimDetails
    .map((claim) => `    - Account ${claim.accountID}: ${claim.netClaimed}`)
    .join("\n")}
`
  )
  .join("\n")}

${
  Object.keys(discrepancies).length > 0
    ? `
Discrepancies Found:
${Object.entries(discrepancies)
  .map(
    ([accountId, values]) => `
  Account ${accountId} (${values.denomination}):
    Total Issued: ${values.trustAccountIssuedTotal}
    Total Net Claimed: ${values.totalNetClaimed}
    Balance Discrepancy: ${values.difference}
    
    Claim Details:
    ${values.claimDetails
      .map((claim) => `      - Account ${claim.accountID}: ${claim.netClaimed}`)
      .join("\n")}`
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
