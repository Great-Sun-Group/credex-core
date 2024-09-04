import express from "express";
import { apiVersionOneRoute } from "..";
import { OnboardMemberController } from "./controllers/onboardMember";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { UpdateMemberTierController } from "./controllers/updateMemberTier";

export default function MemberRoutes(
  app: express.Application,
  jsonParser: any
) {
  /**
   * @swagger
   * /api/v1/onboardMember:
   *   post:
   *     summary: Onboard a new member
   *     tags: [Members]
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
   *               DCOgiveInCXX:
   *                 type: number
   *               DCOdenom:
   *                 type: string
   *     responses:
   *       200:
   *         description: Member onboarded successfully
   *       400:
   *         description: Bad request
   */
  app.post(
    `${apiVersionOneRoute}onboardMember`,
    jsonParser,
    OnboardMemberController
  );

  /**
   * @swagger
   * /api/v1/getMemberDashboardByPhone:
   *   get:
   *     summary: Get member dashboard by phone number
   *     tags: [Members]
   *     parameters:
   *       - in: query
   *         name: phone
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member dashboard retrieved successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Member not found
   */
  app.get(
    `${apiVersionOneRoute}getMemberDashboardByPhone`,
    jsonParser,
    GetMemberDashboardByPhoneController
  );

  /**
   * @swagger
   * /api/v1/getMemberByHandle:
   *   get:
   *     summary: Get member by handle
   *     tags: [Members]
   *     parameters:
   *       - in: query
   *         name: memberHandle
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member retrieved successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Member not found
   */
  app.get(
    `${apiVersionOneRoute}getMemberByHandle`,
    jsonParser,
    GetMemberByHandleController
  );

  /**
   * @swagger
   * /api/v1/updateMemberTier:
   *   post:
   *     summary: Update member tier
   *     tags: [Members]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberID
   *               - newTier
   *             properties:
   *               memberID:
   *                 type: string
   *               newTier:
   *                 type: number
   *     responses:
   *       200:
   *         description: Member tier updated successfully
   *       400:
   *         description: Bad request
   *       404:
   *         description: Member not found
   */
  app.post(
    `${apiVersionOneRoute}updateMemberTier`,
    jsonParser,
    UpdateMemberTierController
  );
}