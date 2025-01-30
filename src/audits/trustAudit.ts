import { Session } from "neo4j-driver";
import { logInfo, logError } from "../utils/logger";

export interface AuditDetails {
  timestamp: string;
  matchStatus: boolean;
}

export interface AuditResult {
  success: boolean;
  details: AuditDetails;
}

/**
 * Records audit claims and verifies balance matches
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
      const violations = denomCheck.records.map((record) => ({
        accountID: record.get("accountID"),
        defaultDenom: record.get("defaultDenom"),
        wrongDenoms: record.get("wrongDenoms"),
      }));

      const error = new Error("Trust account denomination violation");
      logError("Trust account denomination violation", error, { violations });

      return {
        success: false,
        details: {
          timestamp: new Date().toISOString(),
          matchStatus: false,
        },
      };
    }

    // Process each trust account
    const result = await session.run(`
      MATCH (trust:Account {accountType: "TRUST"})
      
      // Create audit report
      WITH trust
      MATCH (daynode:Daynode {Active: true})
      MERGE (daysAudits:DaysAudits)
      ON CREATE SET daysAudits.auditID = randomUUID()
      MERGE (daysAudits)-[:CREATED_ON]->(daynode)
      
      CREATE (report:AuditReport {
        reportID: randomUUID(),
        timestamp: datetime(),
        matchStatus: true
      })
      CREATE (daysAudits)-[:CONTAINS]->(report)
      
      // Calculate and store claims
      WITH trust, report
      OPTIONAL MATCH (trust)-[:SECURES]->(securedCredex:Credex)-[:OWES]-(claimingAccount:Account)
      WITH DISTINCT trust, report, claimingAccount, securedCredex
      MATCH (securedCredex)-[:OWES]->(claimingAccount)-[:OWES]->(securedCredex)
      WITH trust, report, claimingAccount,
           SUM(CASE 
               WHEN (securedCredex)-[:OWES]->(claimingAccount) THEN securedCredex.OutstandingAmount 
               WHEN (claimingAccount)-[:OWES]->(securedCredex) THEN -securedCredex.OutstandingAmount 
               ELSE 0
           END) as netClaimed
      WHERE abs(netClaimed) > 0.001
      
      // Create claim relationship
      CREATE (claimingAccount)-[:AUDITED_CLAIM {
        netClaimed: netClaimed
      }]->(report)
      
      // Return for verification
      RETURN DISTINCT report.reportID as reportID
    `);

    // For each report, verify claims sum to zero
    for (const record of result.records) {
      const reportID = record.get("reportID");

      const verifyResult = await session.run(
        `
        MATCH (report:AuditReport {reportID: $reportID})
        MATCH (account)-[claim:AUDITED_CLAIM]->(report)
        WITH report, SUM(claim.netClaimed) as totalNetClaimed
        SET report.sumVerified = (abs(totalNetClaimed) < 0.001),
            report.matchStatus = (abs(totalNetClaimed) < 0.001)
        RETURN report.matchStatus as matchStatus
      `,
        { reportID }
      );

      const matchStatus = verifyResult.records[0]?.get("matchStatus");

      if (!matchStatus) {
        logError(
          "Trust account claims mismatch",
          new Error("Claims do not sum to zero")
        );
        return {
          success: false,
          details: {
            timestamp: new Date().toISOString(),
            matchStatus: false,
          },
        };
      }
    }

    const timestamp = new Date().toISOString();
    logInfo("Balance audit completed", {
      timestamp,
      matchStatus: true,
    });

    return {
      success: true,
      details: {
        timestamp,
        matchStatus: true,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error during balance audit", err);
    throw error;
  }
}

/**
 * Performs a trust account audit, verifying balances and recording results
 */
export async function performTrustAudit(
  session: Session
): Promise<AuditResult> {
  return await verifyBalanceMatch(session);
}
