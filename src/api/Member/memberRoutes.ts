import express from "express";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { updateMemberTierExpressHandler } from "./controllers/updateMemberTier";
import { onboardMemberExpressHandler } from "./controllers/onboardMember";
import { loginMemberExpressHandler } from "./controllers/loginMember";
import { authForTierSpendLimitExpressHandler } from "./controllers/authForTierSpendLimit";
import { validateRequest } from "../../middleware/validateRequest";
import {
  getMemberByHandleSchema,
  getMemberDashboardByPhoneSchema,
  onboardMemberSchema,
  updateMemberTierSchema,
  authForTierSpendLimitSchema,
  loginMemberSchema,
} from "./memberValidationSchemas";
import logger from "../../../config/logger";
import { authenticate } from "../../../config/authenticate";

const router = express.Router();

logger.info("Initializing Member routes", { module: "memberRoutes" });

/**
 * @openapi
 * /member/login:
 *   post:
 *     tags:
 *       - Member
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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
router.post(
  "/login",
  validateRequest(loginMemberSchema),
  loginMemberExpressHandler
);
logger.debug("Registered route: POST /member/login", { module: "memberRoutes", route: "/login", method: "POST" });

/**
 * @openapi
 * /member/getMemberByHandle:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member by handle
 *     security:
 *       - BearerAuth: []
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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/getMemberByHandle",
  authenticate,
  validateRequest(getMemberByHandleSchema),
  GetMemberByHandleController
);
logger.debug("Registered route: POST /member/getMemberByHandle", { module: "memberRoutes", route: "/getMemberByHandle", method: "POST" });

/**
 * @openapi
 * /member/getMemberDashboardByPhone:
 *   post:
 *     tags:
 *       - Member
 *     summary: Get member dashboard by phone
 *     security:
 *       - BearerAuth: []
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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/getMemberDashboardByPhone",
  authenticate,
  validateRequest(getMemberDashboardByPhoneSchema),
  GetMemberDashboardByPhoneController
);
logger.debug("Registered route: POST /member/getMemberDashboardByPhone", { module: "memberRoutes", route: "/getMemberDashboardByPhone", method: "POST" });

/**
 * @openapi
 * /member/onboardMember:
 *   post:
 *     tags:
 *       - Member
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
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
router.post(
  "/onboardMember",
  validateRequest(onboardMemberSchema),
  onboardMemberExpressHandler
);
logger.debug("Registered route: POST /member/onboardMember", { module: "memberRoutes", route: "/onboardMember", method: "POST" });

/**
 * @openapi
 * /member/updateMemberTier:
 *   post:
 *     tags:
 *       - Member
 *     summary: Update member tier
 *     security:
 *       - BearerAuth: []
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
 *               tier:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/updateMemberTier",
  authenticate,
  validateRequest(updateMemberTierSchema),
  updateMemberTierExpressHandler
);
logger.debug("Registered route: POST /member/updateMemberTier", { module: "memberRoutes", route: "/updateMemberTier", method: "POST" });

/**
 * @openapi
 * /member/authForTierSpendLimit:
 *   post:
 *     tags:
 *       - Member
 *     summary: Authorize secured credex for member's tier
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberID
 *               - tier
 *               - Amount
 *               - Denomination
 *             properties:
 *               memberID:
 *                 type: string
 *               tier:
 *                 type: number
 *               Amount:
 *                 type: number
 *               Denomination:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/authForTierSpendLimit",
  authenticate,
  validateRequest(authForTierSpendLimitSchema),
  authForTierSpendLimitExpressHandler
);
logger.debug("Registered route: POST /member/authForTierSpendLimit", { module: "memberRoutes", route: "/authForTierSpendLimit", method: "POST" });

logger.info("Member routes initialized successfully", { module: "memberRoutes", routesCount: 6 });

export default router;
