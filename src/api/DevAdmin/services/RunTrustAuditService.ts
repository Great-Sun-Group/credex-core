import { Session } from "neo4j-driver";
import { logInfo, logError } from "../../../utils/logger";
import { performTrustAudit } from "../../../audits/trustAudit";
import { ServiceResult } from "../../../types/apiResponse";

/**
 * Service to run trust account audits independently for testing and verification
 */
export async function RunTrustAuditService(
  session: Session
): Promise<ServiceResult<{ success: boolean; timestamp: string }>> {
  try {
    logInfo("Starting trust account audit", {
      timestamp: new Date().toISOString(),
    });

    const auditResult = await performTrustAudit(session);

    logInfo("Trust account audit completed", {
      timestamp: auditResult.details.timestamp,
      matchStatus: auditResult.details.matchStatus,
      discrepancies: auditResult.details.discrepancies,
    });

    return {
      success: true,
      data: {
        success: auditResult.success && auditResult.details.matchStatus,
        timestamp: auditResult.details.timestamp,
      },
      message: auditResult.details.matchStatus
        ? "Trust account audit completed successfully"
        : "Trust account audit completed with discrepancies",
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logError("Error running trust account audit", err);

    return {
      success: false,
      error: {
        code: "AUDIT_ERROR",
        details: err.message,
      },
      message: "Failed to run trust account audit",
    };
  }
}
