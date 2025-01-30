import { Session } from "neo4j-driver";
import { logInfo, logError } from "../utils/logger";
import { calculateSystemChecksum } from "../core-cron/DCO/DCOexecute/checksum";

export interface ClaimDetail {
  accountID: string;
  netClaimed: number;
}

export interface AuditDiscrepancy {
  trustAccountIssuedTotal: number;
  totalNetClaimed: number;
  difference: number;
  denomination: string;
  claimDetails: ClaimDetail[];
  error?: string;
}

export interface TrustAccountAuditDetails {
  accountID: string;
  defaultDenom: string;
  trustAccountIssuedTotal: number;
  claimDetails: ClaimDetail[];
  totalNetClaimed: number;
}

export interface AuditDetails {
  timestamp: string;
  checksum: string;
  matchStatus: boolean;
  discrepancies: Record<string, AuditDiscrepancy>;
  trustAccounts: TrustAccountAuditDetails[];
}

export interface AuditResult {
  success: boolean;
  details: AuditDetails;
}

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
          checksum: await calculateSystemChecksum(session),
          matchStatus: false,
          discrepancies: violations.reduce(
            (acc, v) => ({
              ...acc,
              [v.accountID]: {
                trustAccountIssuedTotal: 0,
                totalNetClaimed: 0,
                difference: 0,
                denomination: v.defaultDenom,
                claimDetails: [],
                error: `Trust account issuing in wrong denominations: ${v.wrongDenoms.join(", ")}`,
              },
            }),
            {}
          ),
          trustAccounts: [],
        },
      };
    }

    // If denomination check passes, proceed with balance verification
    const result = await session.run(`
      MATCH (trust:Account {accountType: "TRUST"})
      
      // Get total issued by trust (we know it's all in their defaultDenom)
      OPTIONAL MATCH (trust)-[:OWES|OFFERS]->(credex:Credex)<-[:SECURES]-(trust)
      WITH trust, COALESCE(SUM(credex.OutstandingAmount), 0) as trustAccountIssuedTotal
      
      // Get balance claims on the trust account
      OPTIONAL MATCH (claimingAccount:Account)<-[:OWES|OFFERS]-(securedIncomingCredex:Credex)<-[:SECURES]-(trust)
      WITH trust, trustAccountIssuedTotal, claimingAccount, COALESCE(SUM(securedIncomingCredex.OutstandingAmount), 0) as grossBalanceClaimed

      // All uncleared credex secured by the trust account that emanate from these accounts
      OPTIONAL MATCH (claimingAccount)-[:OWES|OFFERS]->(securedOutgoingCredex:Credex)<-[:SECURES]-(trust)
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
      const trust = record.get("trust").properties;
      const trustAccountIssuedTotal = Number(record.get("trustAccountIssuedTotal"));
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

      // Only add non-zero claims
      if (claimingAccountId && Math.abs(netClaimed) > 0.001) {
        // Check if we already have a claim for this account
        const existingClaimIndex = trustData.claims.findIndex(
          (c) => c.accountID === claimingAccountId
        );
        if (existingClaimIndex >= 0) {
          // Update existing claim
          trustData.claims[existingClaimIndex].netClaimed += netClaimed;
        } else {
          // Add new claim
          trustData.claims.push({
            accountID: claimingAccountId,
            netClaimed,
          });
        }
      }
    });

    // Process each trust account
    for (const [accountId, trustData] of trustAccountMap) {
      const totalNetClaimed = trustData.claims.reduce(
        (sum, claim) => sum + claim.netClaimed,
        0
      );

      const trustAccountDetails: TrustAccountAuditDetails = {
        accountID: trustData.trust.accountID,
        defaultDenom: trustData.trust.defaultDenom,
        trustAccountIssuedTotal: trustData.trustAccountIssuedTotal,
        claimDetails: trustData.claims,
        totalNetClaimed,
      };

      details.trustAccounts.push(trustAccountDetails);

      if (Math.abs(trustData.trustAccountIssuedTotal - totalNetClaimed) > 0.001) {
        details.matchStatus = false;
        details.discrepancies![trustData.trust.accountID] = {
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
 * Records the audit result in the database using the new data model
 */
async function recordAuditResult(
  session: Session,
  auditResult: AuditResult
): Promise<void> {
  try {
    // First, get or create DaysAudits node for today
    const daysAuditsResult = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      MERGE (daysAudits:DaysAudits)-[:CREATED_ON]->(daynode)
      ON CREATE SET daysAudits.auditID = randomUUID(),
                    daysAudits.AuditIncident = false
      WITH daysAudits, daynode
      
      // Create audit report with audit data
      CREATE (report:AuditReport {
        reportID: randomUUID(),
        timestamp: datetime(),
        checksum: $checksum,
        matchStatus: $matchStatus,
        trustAccounts: $trustAccountsJson,
        discrepancies: $discrepanciesJson
      })
      
      // Connect report to DaysAudits
      CREATE (daysAudits)<-[:AUDIT_ROLLUP]-(report)
      
      // For each trust account in the audit, create the AUDITED_IN relationship
      WITH daysAudits, report, daynode
      
      UNWIND $trustAccountsJson as trustAccountData
      MATCH (trust:Account {accountID: trustAccountData.accountID})
      MERGE (trust)-[:AUDITED_IN]->(daysAudits)
      
      // If there are discrepancies, set the incident flag and create relationships
      WITH daysAudits, report, daynode, $hasDiscrepancies as hasDiscrepancies
      WHERE hasDiscrepancies
      SET daysAudits.AuditIncident = true
      CREATE (daysAudits)-[:UNHANDLED_DISCREPANCY]->(report)
      
      RETURN daysAudits.auditID as daysAuditsID
    `, {
      checksum: auditResult.details.checksum,
      matchStatus: auditResult.details.matchStatus,
      trustAccountsJson: JSON.stringify(auditResult.details.trustAccounts),
      hasDiscrepancies: !auditResult.details.matchStatus,
      discrepanciesJson: JSON.stringify(auditResult.details.discrepancies || {}),
    });

    logInfo("Audit result recorded", {
      timestamp: auditResult.details.timestamp,
      matchStatus: auditResult.details.matchStatus,
      daysAuditsID: daysAuditsResult.records[0]?.get("daysAuditsID"),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error recording audit result", err);
    throw error;
  }
}

/**
 * Performs a trust account audit, verifying balances and recording results
 */
export async function performTrustAudit(session: Session): Promise<AuditResult> {
  const auditResult = await verifyBalanceMatch(session);
  await recordAuditResult(session, auditResult);
  return auditResult;
}
