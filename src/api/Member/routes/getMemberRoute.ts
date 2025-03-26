import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getMemberSchema } from "../memberValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetMemberController } from "../controllers/GetMemberController";

export default function getMemberRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getMember/{memberID}:
   *   get:
   *     tags: [Members]
   *     summary: Get member information
   *     description: Retrieve member profile information, stores, products, and profile pictures
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: memberID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the member to retrieve information for
   *     responses:
   *       200:
   *         description: Member information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Member information retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The member ID
   *                         type:
   *                           type: string
   *                           enum: [MEMBER_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who retrieved the information
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the member
   *                             memberName:
   *                               type: string
   *                               description: Full name of the member
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         member:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the member
   *                             firstname:
   *                               type: string
   *                               description: First name of the member
   *                             lastname:
   *                               type: string
   *                               description: Last name of the member
   *                             memberHandle:
   *                               type: string
   *                               description: Handle of the member
   *                             vendorBio:
   *                               type: string
   *                               description: Biography of the vendor
   *                             vendor:
   *                               type: boolean
   *                               description: Whether the member is a vendor
   *                             profilePictures:
   *                               type: object
   *                               properties:
   *                                 original:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the original profile picture
   *                                 thumbnail:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the thumbnail profile picture
   *                                 pic200:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the 200px profile picture
   *                                 pic600:
   *                                   type: string
   *                                   format: uuid
   *                                   nullable: true
   *                                   description: ID of the 600px profile picture
   *                         stores:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               storeID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the store
   *                               storeName:
   *                                 type: string
   *                                 description: Name of the store
   *                               storeHandle:
   *                                 type: string
   *                                 description: Handle of the store
   *                               storeDescription:
   *                                 type: string
   *                                 description: Description of the store
   *                               storeOpen:
   *                                 type: boolean
   *                                 description: Whether the store is open
   *                               location:
   *                                 type: object
   *                                 nullable: true
   *                                 properties:
   *                                   latitude:
   *                                     type: number
   *                                     format: float
   *                                     description: Latitude coordinate of the store
   *                                   longitude:
   *                                     type: number
   *                                     format: float
   *                                     description: Longitude coordinate of the store
   *                               thumbnailPicID:
   *                                 type: string
   *                                 format: uuid
   *                                 nullable: true
   *                                 description: ID of the store's thumbnail picture
   *                         products:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               productID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the product
   *                               productName:
   *                                 type: string
   *                                 description: Name of the product
   *                               productHandle:
   *                                 type: string
   *                                 description: Handle of the product
   *                               productDescription:
   *                                 type: string
   *                                 description: Description of the product
   *                               thumbnailPicID:
   *                                 type: string
   *                                 format: uuid
   *                                 nullable: true
   *                                 description: ID of the product's thumbnail picture
   *       400:
   *         description: Invalid input parameters
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid input parameters
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: VALIDATION_ERROR
   *                             reason:
   *                               type: string
   *                             field:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Authentication required
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
   *                           enum: [ERROR_UNAUTHORIZED]
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
   *                               example: NO_AUTH
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: MEMBER_NOT_FOUND
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while retrieving member information
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
   *                           enum: [ERROR_INTERNAL]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   */
  router.get(
    `/getMember/:memberID`,
    validateRequest(getMemberSchema),
    authenticatedHandler(GetMemberController),
    errorHandler
  );
  logger.debug("Route registered: GET /getMember/:memberID");

  return router;
}
