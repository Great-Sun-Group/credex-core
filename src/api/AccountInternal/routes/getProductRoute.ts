import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getProductSchema } from "../accountInternalValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetProductController } from "../controllers/GetProductController";

export default function getProductRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getProduct/{productID}:
   *   get:
   *     tags: [AccountInternal]
   *     summary: Get product information
   *     description: Retrieve product details, store information, and vendor information
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: productID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the product to retrieve information for
   *     responses:
   *       200:
   *         description: Product information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Product information retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The product ID
   *                         type:
   *                           type: string
   *                           enum: [PRODUCT_RETRIEVED]
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
   *                             productID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the product
   *                             productName:
   *                               type: string
   *                               description: Name of the product
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         product:
   *                           type: object
   *                           properties:
   *                             productID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the product
   *                             productName:
   *                               type: string
   *                               description: Name of the product
   *                             productHandle:
   *                               type: string
   *                               description: Handle of the product
   *                             productDescription:
   *                               type: string
   *                               description: Description of the product
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
   *                             attributes:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   name:
   *                                     type: string
   *                                     description: Name of the attribute
   *                                   value:
   *                                     type: string
   *                                     description: Value of the attribute
   *                         store:
   *                           type: object
   *                           nullable: true
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
   *                             profilePicture:
   *                               type: string
   *                               format: uuid
   *                               nullable: true
   *                               description: ID of the vendor's profile picture
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
   *         description: Product not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Product not found
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
   *                               example: PRODUCT_NOT_FOUND
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
   *                   example: Internal server error while retrieving product information
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
    `/getProduct/:productID`,
    validateRequest(getProductSchema, "params"),
    authenticatedHandler(GetProductController),
    errorHandler
  );
  logger.debug("Route registered: GET /getProduct/:productID");

  return router;
}
