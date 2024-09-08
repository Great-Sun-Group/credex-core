"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const getMemberByHandle_1 = require("./controllers/getMemberByHandle");
const getMemberDashboardByPhone_1 = require("./controllers/getMemberDashboardByPhone");
const updateMemberTier_1 = require("./controllers/updateMemberTier");
const onboardMember_1 = require("./controllers/onboardMember");
const securedCredexAuthForTier_1 = require("./controllers/securedCredexAuthForTier");
const router = express_1.default.Router();
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
router.post("/getMemberByHandle", getMemberByHandle_1.GetMemberByHandleController);
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
router.post("/getMemberDashboardByPhone", getMemberDashboardByPhone_1.GetMemberDashboardByPhoneController);
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
router.post("/onboardMember", onboardMember_1.onboardMemberExpressHandler);
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
router.post("/updateMemberTier", updateMemberTier_1.updateMemberTierExpressHandler);
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
router.post("/securedCredexAuthForTier", securedCredexAuthForTier_1.securedCredexAuthForTierExpressHandler);
exports.default = router;
//# sourceMappingURL=memberRoutes.js.map