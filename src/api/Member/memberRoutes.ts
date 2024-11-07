import express from "express";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { onboardMemberExpressHandler } from "./controllers/onboardMember";
import { loginMemberExpressHandler } from "./controllers/loginMember";
import { authForTierSpendLimitExpressHandler } from "./controllers/authForTierSpendLimit";
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
   *     description: Authenticate a member using their phone number
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
   *                 description: Member's phone number in international format
   *                 example: "+1234567890"
   *     responses:
   *       200:
   *         description: Login successful
   *       400:
   *         description: Invalid phone number format
   *       404:
   *         description: Member not found
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
   *     description: Retrieve member information using their handle
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
   *                 description: Member's unique handle
   *                 example: "john_doe"
   *     responses:
   *       200:
   *         description: Member information retrieved successfully
   *       404:
   *         description: Member not found
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
   *     description: Retrieve member's dashboard information using their phone number
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
   *                 description: Member's phone number in international format
   *                 example: "+1234567890"
   *     responses:
   *       200:
   *         description: Member dashboard retrieved successfully
   *       404:
   *         description: Member not found
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
   *     description: Create a new member account with basic information
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
   *                 description: Member's first name
   *                 example: "John"
   *               lastname:
   *                 type: string
   *                 description: Member's last name
   *                 example: "Doe"
   *               phone:
   *                 type: string
   *                 description: Member's phone number in international format
   *                 example: "+1234567890"
   *               defaultDenom:
   *                 type: string
   *                 description: Member's default denomination
   *                 example: "USD"
   *     responses:
   *       200:
   *         description: Member onboarded successfully
   *       400:
   *         description: Invalid input data
   */
  router.post(
    `/onboardMember`,
    validateRequest(onboardMemberSchema),
    onboardMemberExpressHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /onboardMember");

  /**
   * @swagger
   * /api/member/authForTierSpendLimit:
   *   post:
   *     tags: [Members]
   *     summary: Authorize tier spend limit
   *     description: Authorize a spending limit for a member's tier
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
   *                 description: ID of the issuer account
   *               Amount:
   *                 type: number
   *                 description: Spend limit amount
   *                 example: 1000
   *               Denomination:
   *                 type: string
   *                 description: Currency denomination
   *                 example: "USD"
   *               securedCredex:
   *                 type: boolean
   *                 description: Whether the credex is secured
   *     responses:
   *       200:
   *         description: Tier spend limit authorized successfully
   *       400:
   *         description: Invalid input data
   */
  router.post(
    `/authForTierSpendLimit`,
    validateRequest(authForTierSpendLimitSchema),
    authForTierSpendLimitExpressHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /authForTierSpendLimit");

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 5,
  });

  return router;
}
