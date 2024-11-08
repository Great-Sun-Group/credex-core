import express from "express";
import { getCredexDetailsController } from "./controllers/getCredexDetailsController";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import { adminAuth } from "../../middleware/adminAuth";
import {
  getCredexSchema,
  getMemberSchema,
  updateMemberTierSchema,
  getAccountSchema,
  getAccountReceivedCredexOffersSchema,
  getSentCredexOffersSchema,
} from "./adminSchemas";
import logger from "../../utils/logger";
import { getMemberDetailsController } from "./controllers/getMemberDetailsController";
import { getAccountDetailsController } from "./controllers/getAccountDetailsController";
import { updateMemberTierController } from "./controllers/updateMemberController";
import { getReceivedCredexOffersController } from "./controllers/getReceivedCredexOffersController";
import { getSentCredexOffersController } from "./controllers/getSentCredexOffersController";

/**
 * @swagger
 * tags:
 *   name: DevAdmin
 *   description: Development and administration operations
 */

export default function AdminRoutes() {
  const router = express.Router();
  logger.info("Initializing Admin routes");

  /**
   * @swagger
   * /api/admin/getCredexDetails:
   *   post:
   *     tags: [DevAdmin]
   *     summary: Get detailed Credex information
   *     security:
   *       - adminAuth: [1]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/admin/getCredexDetails`,    
    adminAuth(1),
    validateRequest(getCredexSchema),    
    getCredexDetailsController,
    errorHandler
  );

  /**
   * @swagger
   * /api/admin/getMemberDetails:
   *   post:
   *     tags: [DevAdmin]
   *     summary: Get detailed member information
   *     security:
   *       - adminAuth: [1]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberID
   *             properties:
   *               memberID:
   *                 type: string
   *                 format: uuid
   */
  router.post(
    `/admin/getMemberDetails`,
    adminAuth(1),
    validateRequest(getMemberSchema),
    getMemberDetailsController,
    errorHandler
  );

  /**
   * @swagger
   * /api/admin/getAccountDetails:
   *   post:
   *     tags: [DevAdmin]
   *     summary: Get detailed account information
   *     security:
   *       - adminAuth: [1]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             oneOf:
   *               - required: [accountID]
   *               - required: [accountHandle]
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   */
  router.post(
    `/admin/getAccountDetails`,
    adminAuth(1),
    validateRequest(getAccountSchema),
    getAccountDetailsController,
    errorHandler
  );

  /**
   * @swagger
   * /api/admin/getReceivedCredexOffers:
   *   post:
   *     tags: [DevAdmin]
   *     summary: Get received Credex offers
   *     security:
   *       - adminAuth: [1]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             oneOf:
   *               - required: [accountID]
   *               - required: [accountHandle]
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   */
  router.post(
    `/admin/getReceivedCredexOffers`,
    adminAuth(1),
    validateRequest(getAccountReceivedCredexOffersSchema),
    getReceivedCredexOffersController,
    errorHandler
  );

  /**
   * @swagger
   * /api/admin/getSentCredexOffers:
   *   post:
   *     tags: [DevAdmin]
   *     summary: Get sent Credex offers
   *     security:
   *       - adminAuth: [1]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             oneOf:
   *               - required: [accountID]
   *               - required: [accountHandle]
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *               accountHandle:
   *                 type: string
   *                 pattern: ^[a-z0-9_]{3,30}$
   */
  router.post(
    `/admin/getSentCredexOffers`,
    adminAuth(1),
    validateRequest(getSentCredexOffersSchema),
    getSentCredexOffersController,
    errorHandler
  );

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
   *               - memberID
   *               - tier
   *             properties:
   *               memberID:
   *                 type: string
   *                 format: uuid
   *               tier:
   *                 type: integer
   *                 minimum: 1
   */
  router.post(
    `/admin/updateMemberTier`,
    adminAuth(2),
    validateRequest(updateMemberTierSchema),
    updateMemberTierController,
    errorHandler
  );

  router.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
  return router;
}
