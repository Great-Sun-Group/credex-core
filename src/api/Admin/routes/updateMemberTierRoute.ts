import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { updateMemberTierSchema } from "../adminSchemas";
import { updateMemberTierController } from "../controllers/updateMemberController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/admin/updateMemberTier:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Update member tier level
 *     security:
 *       - adminAuth: [2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetMemberID
 *               - tier
 *             properties:
 *               targetMemberID:
 *                 type: string
 *                 format: uuid
 *               tier:
 *                 type: integer
 *                 minimum: 1
 */
export const updateMemberTierRoute = [
  adminAuth(2),
  validateRequest(updateMemberTierSchema),
  updateMemberTierController,
  errorHandler,
];
