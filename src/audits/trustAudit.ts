import { Session } from "neo4j-driver";
import { logInfo, logError } from "../utils/logger";

export interface AuditResult {
  success: boolean;
  details: {
    timestamp: string;
    reportCount?: number;
    discrepancies?: Array<{
      accountId: string;
      expectedAmount: number;
      actualAmount: number;
      denom: string;
    }>;
  };
}

/**
 * Performs trust account audit for CREDEX_FOUNDATION_AUDITED accounts
 */
async function performTrustAudit(session: Session): Promise<AuditResult> {
  try {
    const result = await session.run(`
      MATCH (daynode:Daynode { Active: true })

      // Start with CREDEX_FOUNDATION_AUDITED accounts
      OPTIONAL MATCH (securedCredex:Credex)<-[:SECURES]-(trustAccountWithSecured:Account)
        <-[:CREDEX_FOUNDATION_AUDITED]-(credexFoundation:Account { accountType: "CREDEX_FOUNDATION"})

      // Create unique report for each trust account with atomic relationships
      WITH DISTINCT trustAccountWithSecured, daynode
      MERGE (report:TrustAuditReport)-[:CLAIMS_AGAINST]->(trustAccountWithSecured)-[:CREATED_ON]->(daynode)
      ON CREATE
        SET report.created = datetime()
        SET report.reportID = randomUUID()
      SET report.lastUpdated = datetime()

      // First delete all existing claims for cleanup
      WITH trustAccountWithSecured, report, daynode
      OPTIONAL MATCH (anyAccount:Account)-[oldClaim:TRUST_AUDIT_CLAIM]->(report)
      DELETE oldClaim

      // Match secured Credex nodes and collect them to ensure uniqueness
      WITH trustAccountWithSecured, report, daynode
      MATCH (trustAccountWithSecured)-[:SECURES]->(securedCredex:Credex)
      WITH trustAccountWithSecured, report, daynode, collect(DISTINCT securedCredex) as securedCredexes
      UNWIND securedCredexes as securedCredex

      // Match OWES relationships
      OPTIONAL MATCH (securedCredex)-[owesRel:OWES]-(claimingAccount:Account)
      WITH DISTINCT claimingAccount, report, securedCredex, daynode, trustAccountWithSecured, owesRel

      // Calculate amounts by direction for each relationship
      WITH claimingAccount, report, daynode, trustAccountWithSecured,
           sum(CASE 
             WHEN startNode(owesRel) = securedCredex THEN securedCredex.OutstandingAmount 
             ELSE 0 
           END) as outgoingAmount,
           sum(CASE 
             WHEN endNode(owesRel) = securedCredex THEN securedCredex.OutstandingAmount 
             ELSE 0 
           END) as incomingAmount

      // Calculate net balance and create claim
      WITH DISTINCT claimingAccount, report, daynode, trustAccountWithSecured,
           (outgoingAmount - incomingAmount) as netBalance

      CREATE (claimingAccount)-[:TRUST_AUDIT_CLAIM {
        claimAmountCXX: netBalance,
        claimDenom: trustAccountWithSecured.defaultDenom,
        claimAmountInDenom: netBalance * daynode[trustAccountWithSecured.defaultDenom],
        timestamp: datetime()
      }]->(report)
      
      RETURN count(report) as reportCount
    `);

    const timestamp = new Date().toISOString();
    const reportCount = result.records[0].get("reportCount").toNumber();

    logInfo("Trust audit completed", {
      timestamp,
      reportCount,
    });

    return {
      success: true,
      details: {
        timestamp,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error during trust audit", err);
    throw error;
  }
}

/**
 * Performs post-DCO trust account audit
 * Creates TrustAuditReportDCO nodes to avoid overwriting regular audit reports
 */
async function performPostDCOTrustAudit(
  session: Session
): Promise<AuditResult> {
  try {
    const result = await session.run(`
      MATCH (daynode:Daynode { Active: true })

      // Start with CREDEX_FOUNDATION_AUDITED accounts
      OPTIONAL MATCH (securedCredex:Credex)<-[:SECURES]-(trustAccountWithSecured:Account)
        <-[:CREDEX_FOUNDATION_AUDITED]-(credexFoundation:Account { accountType: "CREDEX_FOUNDATION"})

      // Create unique DCO report for each trust account with atomic relationships
      WITH DISTINCT trustAccountWithSecured, daynode
      MERGE (report:TrustAuditReportDCO)-[:CLAIMS_AGAINST]->(trustAccountWithSecured)-[:CREATED_ON]->(daynode)
      ON CREATE
        SET report.created = datetime()
        SET report.reportID = randomUUID()
      SET report.lastUpdated = datetime()

      // Match secured Credex nodes and collect them
      WITH trustAccountWithSecured, report, daynode
      MATCH (trustAccountWithSecured)-[:SECURES]->(securedCredex:Credex)
      WITH trustAccountWithSecured, report, daynode, collect(DISTINCT securedCredex) as securedCredexes
      UNWIND securedCredexes as securedCredex

      // Match OWES relationships
      OPTIONAL MATCH (securedCredex)-[owesRel:OWES]-(claimingAccount:Account)
      WITH DISTINCT claimingAccount, report, securedCredex, daynode, trustAccountWithSecured, owesRel

      // Calculate amounts by direction for each relationship
      WITH claimingAccount, report, daynode, trustAccountWithSecured,
           sum(CASE 
             WHEN startNode(owesRel) = securedCredex THEN securedCredex.OutstandingAmount 
             ELSE 0 
           END) as outgoingAmount,
           sum(CASE 
             WHEN endNode(owesRel) = securedCredex THEN securedCredex.OutstandingAmount 
             ELSE 0 
           END) as incomingAmount

      // Calculate net balance and create claim
      WITH DISTINCT claimingAccount, report, daynode, trustAccountWithSecured,
           (outgoingAmount - incomingAmount) as netBalance

      CREATE (claimingAccount)-[:TRUST_AUDIT_CLAIM {
        claimAmountCXX: netBalance,
        claimDenom: trustAccountWithSecured.defaultDenom,
        claimAmountInDenom: netBalance * daynode[trustAccountWithSecured.defaultDenom],
        timestamp: datetime()
      }]->(report)
      
      RETURN count(report) as reportCount
    `);

    const timestamp = new Date().toISOString();
    const reportCount = result.records[0].get("reportCount").toNumber();

    logInfo("Post-DCO trust audit completed", {
      timestamp,
      reportCount,
    });

    return {
      success: true,
      details: {
        timestamp,
        reportCount,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error during post-DCO trust audit", err);
    throw error;
  }
}

export { performTrustAudit, performPostDCOTrustAudit };
