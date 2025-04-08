import { Request, Response, NextFunction } from "express";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { RunTrustAuditService } from "../services/RunTrustAuditService";
import { DevAdminActionType, TypedDevAdminResponse, DevAdminAuditDetails, DevAdminAuditDashboard } from "../types";
import logger from "../../../utils/logger";

interface CustomRequest extends Request {
  id: string;
}

type RunTrustAuditResponse = TypedDevAdminResponse<DevAdminAuditDetails, DevAdminAuditDashboard>;

export async function runTrustAudit(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  const auditId = `AUDIT-${new Date().toISOString()}`;
  const session = ledgerSpaceDriver.session();

  logger.debug('Trust account audit requested', { requestId, auditId });

  try {
    const result = await RunTrustAuditService(session);

    if (!result.success) {
      const response: RunTrustAuditResponse = {
        message: result.message,
        data: {
          action: {
            id: auditId,
            type: DevAdminActionType.DEV_ADMIN_AUDIT_FAILED,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              success: false,
              timestamp: new Date().toISOString(),
              discrepancies: result.error ? { error: result.error } : undefined,
            },
          },
          dashboard: {
            auditInfo: {
              success: false,
              timestamp: new Date().toISOString(),
            },
            stats: {
              totalTrustAccounts: 0,
              accountsWithDiscrepancies: 0,
            },
          },
        },
      };
      res.status(500).json(response);
      return;
    }

    const response: RunTrustAuditResponse = {
      message: result.message,
      data: {
        action: {
          id: auditId,
          type: DevAdminActionType.DEV_ADMIN_AUDIT_COMPLETED,
          timestamp: result.data?.timestamp || new Date().toISOString(),
          actor: 'system',
          details: {
            success: result.data?.success || false,
            timestamp: result.data?.timestamp || new Date().toISOString(),
            discrepancies: result.data?.success ? undefined : result.error,
          },
        },
        dashboard: {
          auditInfo: {
            success: result.data?.success || false,
            timestamp: result.data?.timestamp || new Date().toISOString(),
          },
          stats: {
            totalTrustAccounts: result.data?.success ? 1 : 0, // We'll update this when we have trust account count
            accountsWithDiscrepancies: result.data?.success ? 0 : 1,
          },
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error running trust account audit', {
      requestId,
      auditId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: RunTrustAuditResponse = {
      message: "Failed to run trust account audit",
      data: {
        action: {
          id: auditId,
          type: DevAdminActionType.DEV_ADMIN_AUDIT_FAILED,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            success: false,
            timestamp: new Date().toISOString(),
            discrepancies: error instanceof Error ? { error: error.message } : undefined,
          },
        },
        dashboard: {
          auditInfo: {
            success: false,
            timestamp: new Date().toISOString(),
          },
          stats: {
            totalTrustAccounts: 0,
            accountsWithDiscrepancies: 0,
          },
        },
      },
    };

    res.status(500).json(response);
  } finally {
    await session.close();
  }
}
