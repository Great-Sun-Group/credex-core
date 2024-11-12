import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { adminAuth } from "../../../middleware/adminAuth";
import { updateMemberTierSchema } from "../adminSchemas";
import { updateMemberTierController } from "../controllers/updateMemberController";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /admin/updateMemberTier:
 *   post:
 *     tags: [Admin]
 *     summary: Update member tier level
 *     description: Updates a member's tier level using memberID
 *     security:
 *       - adminAuth: [2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *             properties:
 *               memberID:
 *                 type: string
 *                 format: uuid
 *                 description: Unique identifier of the member
 *               tier:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: New tier level for the member
 *     responses:
 *       200:
 *         description: Member tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member tier updated successfully
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           description: Member ID
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_MEMBER_UPDATED]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           description: Who performed the action (system)
 *                         details:
 *                           type: object
 *                           properties:
 *                             memberID:
 *                               type: string
 *                               format: uuid
 *                             handle:
 *                               type: string
 *                             tier:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         memberInfo:
 *                           type: object
 *                           properties:
 *                             memberID:
 *                               type: string
 *                               format: uuid
 *                             firstname:
 *                               type: string
 *                             lastname:
 *                               type: string
 *                             phone:
 *                               type: string
 *                             memberHandle:
 *                               type: string
 *                             memberTier:
 *                               type: number
 *                             defaultDenom:
 *                               type: string
 *                             updatedAt:
 *                               type: string
 *                               format: date-time
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid memberID format or tier value
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           nullable: true
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_VALIDATION]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                             reason:
 *                               type: string
 *                             field:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member not found
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_NOT_FOUND]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                             reason:
 *                               type: string
 *                     dashboard:
 *                       type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error updating member tier
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           enum: [ADMIN_ERROR_INTERNAL]
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                             reason:
 *                               type: string
 *                     dashboard:
 *                       type: object
 */
export const updateMemberTierRoute = [
  adminAuth(2),
  validateRequest(updateMemberTierSchema),
  updateMemberTierController,
  errorHandler,
];
