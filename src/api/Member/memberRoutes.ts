import express from "express";
import { apiVersionOneRoute } from "../../index";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { OnboardMemberController } from "./controllers/onboardMember";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { updateMemberTierExpressHandler } from "./controllers/updateMemberTier";
import { onboardMemberExpressHandler } from "./controllers/onboardMember";
import { securedCredexAuthForTierExpressHandler } from "./controllers/securedCredexAuthForTier";
import { validateRequest } from "../../../middleware/validateRequest";
import {
  getMemberByHandleSchema,
  getMemberDashboardByPhoneSchema,
  onboardMemberSchema,
  updateMemberTierSchema,
  securedCredexAuthForTierSchema
} from "./memberValidationSchemas";

const router = express.Router();

/**
 * @openapi
 * /member/getMemberByHandle:
 *   post:
 *     tags:
 *       - Member
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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
router.post("/getMemberByHandle", validateRequest(getMemberByHandleSchema), GetMemberByHandleController);

/**
 * @openapi
 * /member/getMemberDashboardByPhone:
 *   post:
 *     tags:
 *       - Member
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
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 */
router.post("/getMemberDashboardByPhone", validateRequest(getMemberDashboardByPhoneSchema), GetMemberDashboardByPhoneController);

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
router.post("/onboardMember", validateRequest(onboardMemberSchema), onboardMemberExpressHandler);

/**
 * @openapi
 * /member/updateMemberTier:
 *   post:
 *     tags:
 *       - Member
 *     summary: Update member tier
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
 */
router.post("/updateMemberTier", validateRequest(updateMemberTierSchema), updateMemberTierExpressHandler);

/**
 * @openapi
 * /member/securedCredexAuthForTier:
 *   post:
 *     tags:
 *       - Member
 *     summary: Authorize secured credex for member's tier
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
 */
router.post("/securedCredexAuthForTier", validateRequest(securedCredexAuthForTierSchema), securedCredexAuthForTierExpressHandler);

export default router;
