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
   * /api/member/getMemberByHandle:
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
   *                 memberData:
   *                   type: object
   *                   properties:
   *                     memberID:
   *                       type: string
   *                       format: uuid
   *                       description: Unique member identifier
   *                     memberName:
   *                       type: string
   *                       description: Full name of the member
   *       400:
   *         description: Invalid member handle format
   *       404:
   *         description: Member not found
   *       500:
   *         description: Internal server error
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
