import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getStorefrontSchema } from "../accountValidationSchemas";
import { authMiddleware } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetStorefrontController } from "../controllers/getStorefrontController";

export default function getStorefrontRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getStorefront/{accountID}:
   *   get:
   *     tags: [Accounts]
   *     summary: Get storefront information
   *     description: Retrieve store details, products, and vendor information
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: accountID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the account to retrieve storefront information for
   *     responses:
   *       200:
   *         description: Storefront information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Storefront information retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The account ID
   *                         type:
   *                           type: string
   *                           enum: [STOREFRONT_RETRIEVED]
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
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the account
   *                             storeName:
   *                               type: string
   *                               description: Name of the store
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         store:
   *                           type: object
   *                           properties:
   *                             storeID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the store
   *                             storeName:
   *                               type: string
   *                               description: Name of the store
   *                             storeHandle:
   *                               type: string
   *                               description: Handle of the store
   *                             storeDescription:
   *                               type: string
   *                               description: Description of the store
   *                             storeOpen:
   *                               type: boolean
   *                               description: Whether the store is open
   *                             location:
   *                               type: object
   *                               nullable: true
   *                               properties:
   *                                 latitude:
   *                                   type: number
   *                                   format: float
   *                                   description: Latitude coordinate of the store
   *                                 longitude:
   *                                   type: number
   *                                   format: float
   *                                   description: Longitude coordinate of the store
   *                             profilePictureUrls:
   *                               type: object
   *                               properties:
   *                                 original:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the original profile picture
   *                                 thumbnail:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the thumbnail profile picture
   *                                 pic200:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the 200px profile picture
   *                                 pic600:
   *                                   type: string
   *                                   nullable: true
   *                                   description: URL of the 600px profile picture
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
   *                               thumbnailPicUrl:
   *                                 type: string
   *                                 nullable: true
   *                                 description: URL of the product's thumbnail picture
   *                         vendor:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the vendor
   *                             firstname:
   *                               type: string
   *                               description: First name of the vendor
   *                             lastname:
   *                               type: string
   *                               description: Last name of the vendor
   *                             memberHandle:
   *                               type: string
   *                               description: Handle of the vendor
   *                             vendorBio:
   *                               type: string
   *                               description: Biography of the vendor
   *                             profilePictureUrl:
   *                               type: string
   *                               nullable: true
   *                               description: URL of the vendor's profile picture
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
   *         description: Store not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Store not found
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
   *                               example: STORE_NOT_FOUND
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
   *                   example: Internal server error while retrieving storefront information
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
    `/getStorefront/:accountID`,
    validateRequest(getStorefrontSchema, "params"),
    authMiddleware(),
    GetStorefrontController,
    errorHandler
  );
  logger.debug("Route registered: GET /getStorefront/:accountID");

  return router;
}
