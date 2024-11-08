import express from "express";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { OnboardMemberController } from "./controllers/onboardMember";
import { loginMemberExpressHandler } from "./controllers/loginMember";
import { AuthForTierSpendLimitController } from "./controllers/authForTierSpendLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { errorHandler } from "../../middleware/errorHandler";
import {
  getMemberByHandleSchema,
  getMemberDashboardByPhoneSchema,
  onboardMemberSchema,
  authForTierSpendLimitSchema,
  loginMemberSchema,
} from "./memberValidationSchemas";
import logger from "../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Member management operations
 */

export default function MemberRoutes() {
  const router = express.Router();
  logger.info("Initializing Member routes");

  /**
   * @swagger
   * /api/member/login:
   *   post:
   *     tags: [Members]
   *     summary: Login a member
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *             properties:
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   */
  router.post(
    `/login`,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /login");

  /**
   * @swagger
   * /api/member/getMemberByHandle:
   *   post:
   *     tags: [Members]
   *     summary: Get member by handle
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
   */
  router.post(
    `/getMemberByHandle`,
    validateRequest(getMemberByHandleSchema),
    GetMemberByHandleController,
    errorHandler
  );
  logger.debug("Route registered: POST /getMemberByHandle");

  /**
   * @swagger
   * /api/member/getMemberDashboardByPhone:
   *   post:
   *     tags: [Members]
   *     summary: Get member dashboard by phone
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *             properties:
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   */
  router.post(
    `/getMemberDashboardByPhone`,
    validateRequest(getMemberDashboardByPhoneSchema),
    GetMemberDashboardByPhoneController,
    errorHandler
  );
  logger.debug("Route registered: POST /getMemberDashboardByPhone");

  /**
   * @swagger
   * /api/member/onboardMember:
   *   post:
   *     tags: [Members]
   *     summary: Onboard a new member
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - firstname
   *               - lastname
   *               - phone
   *               - defaultDenom
   *             properties:
   *               firstname:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               lastname:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   */
  router.post(
    `/onboardMember`,
    validateRequest(onboardMemberSchema),
    OnboardMemberController,
    errorHandler
  );
  logger.debug("Route registered: POST /onboardMember");

  /**
   * @swagger
   * /api/member/authForTierSpendLimit:
   *   post:
   *     tags: [Members]
   *     summary: Authorize tier spend limit
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - issuerAccountID
   *               - Amount
   *               - Denomination
   *               - securedCredex
   *             properties:
   *               issuerAccountID:
   *                 type: string
   *                 format: uuid
   *               Amount:
   *                 type: number
   *                 minimum: 0
   *                 exclusiveMinimum: true
   *               Denomination:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *               securedCredex:
   *                 type: boolean
   */
  router.post(
    `/authForTierSpendLimit`,
    validateRequest(authForTierSpendLimitSchema),
    AuthForTierSpendLimitController,
    errorHandler
  );
  logger.debug("Route registered: POST /authForTierSpendLimit");

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 5,
  });

  return router;
}
