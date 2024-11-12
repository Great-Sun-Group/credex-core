import express from "express";
import { GetMemberByHandleController } from "../controllers/getMemberByHandle";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getMemberByHandleSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function getMemberByHandleRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getMemberByHandle:
   *   post:
   *     tags: [Members]
   *     summary: Get member by handle
   *     description: Retrieves member information using their unique handle
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberHandle
   *             properties:
   *               memberHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   *                 description: Lowercase letters, numbers, and underscores only
   *     responses:
   *       200:
   *         description: Member found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Human-friendly success message
   *                   example: Found member John Doe
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Member ID that was found
   *                         type:
   *                           type: string
   *                           enum: [MEMBER_FOUND]
   *                           description: Type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member that was found
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: Unique identifier for the member
   *                             memberName:
   *                               type: string
   *                               description: Full name of the member
   *                             memberHandle:
   *                               type: string
   *                               description: Member's unique handle
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard since this is just a lookup endpoint
   *       400:
   *         description: Invalid member handle format
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message explaining the validation failure
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
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
   *                               example: INVALID_HANDLE
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                             field:
   *                               type: string
   *                               example: memberHandle
   *                     dashboard:
   *                       type: object
   *       404:
   *         description: Member not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Member not found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_NOT_FOUND]
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
   *                               example: NOT_FOUND
   *                             reason:
   *                               type: string
   *                               example: No member exists with the provided handle
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    `/getMemberByHandle`,
    validateRequest(getMemberByHandleSchema),
    GetMemberByHandleController,
    errorHandler
  );
  logger.debug("Route registered: POST /getMemberByHandle");

  return router;
}
