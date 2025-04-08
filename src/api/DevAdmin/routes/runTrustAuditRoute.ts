import { Router } from "express";
import { runTrustAudit } from "../controllers/runTrustAudit";

/**
 * @swagger
 * /devadmin/runTrustAudit:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Run trust account audit
 *     description: Performs a trust account audit to verify balances and records results
 *     security:
 *       - devAdminAuth: []
 *     responses:
 *       200:
 *         description: Audit completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Trust account audit completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: AUDIT-2025-01-30T14:34:55.000Z
 *                         type:
 *                           type: string
 *                           example: DEV_ADMIN_AUDIT_COMPLETED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             success:
 *                               type: boolean
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                             discrepancies:
 *                               type: object
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         auditInfo:
 *                           type: object
 *                           properties:
 *                             success:
 *                               type: boolean
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalTrustAccounts:
 *                               type: number
 *                             accountsWithDiscrepancies:
 *                               type: number
 *       500:
 *         description: Error running audit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DevAdminError'
 */
export const runTrustAuditRoute = Router().post("/devadmin/runTrustAudit", runTrustAudit);
