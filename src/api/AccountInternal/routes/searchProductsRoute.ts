import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { searchProductsSchema } from "../accountInternalValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { SearchProductsController } from "../controllers/SearchProductsController";

export default function searchProductsRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /searchProducts:
   *   get:
   *     tags: [AccountInternal]
   *     summary: Search for products in the Vimbiso Market
   *     description: Search for products by keyword and location in the Vimbiso Market
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: keyword
   *         required: true
   *         schema:
   *           type: string
   *         description: Search keyword for product names
   *       - in: query
   *         name: latitude
   *         required: true
   *         schema:
   *           type: number
   *           format: float
   *           minimum: -90
   *           maximum: 90
   *         description: Latitude coordinate for location-based search
   *       - in: query
   *         name: longitude
   *         required: true
   *         schema:
   *           type: number
   *           format: float
   *           minimum: -180
   *           maximum: 180
   *         description: Longitude coordinate for location-based search
   *       - in: query
   *         name: radius
   *         required: false
   *         schema:
   *           type: number
   *           format: float
   *           minimum: 0
   *           maximum: 100
   *           default: 10
   *         description: Search radius in kilometers (default 10km)
   *     responses:
   *       200:
   *         description: Products found successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Products found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                           description: No specific ID for search action
   *                         type:
   *                           type: string
   *                           enum: [PRODUCTS_SEARCHED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who performed the search
   *                         details:
   *                           type: object
   *                           properties:
   *                             keyword:
   *                               type: string
   *                               description: Search keyword used
   *                             latitude:
   *                               type: number
   *                               format: float
   *                               description: Latitude coordinate used
   *                             longitude:
   *                               type: number
   *                               format: float
   *                               description: Longitude coordinate used
   *                             radius:
   *                               type: number
   *                               format: float
   *                               description: Search radius in kilometers
   *                             resultsCount:
   *                               type: integer
   *                               description: Number of products found
   *                     dashboard:
   *                       type: object
   *                       properties:
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
   *                               productDescription:
   *                                 type: string
   *                                 description: Description of the product
   *                               productHandle:
   *                                 type: string
   *                                 description: Handle of the product
   *                               store:
   *                                 type: object
   *                                 properties:
   *                                   storeID:
   *                                     type: string
   *                                     format: uuid
   *                                     description: ID of the store
   *                                   storeName:
   *                                     type: string
   *                                     description: Name of the store
   *                                   storeHandle:
   *                                     type: string
   *                                     description: Handle of the store
   *                                   storeDescription:
   *                                     type: string
   *                                     description: Description of the store
   *                                   location:
   *                                     type: object
   *                                     properties:
   *                                       latitude:
   *                                         type: number
   *                                         format: float
   *                                         description: Latitude coordinate of the store
   *                                       longitude:
   *                                         type: number
   *                                         format: float
   *                                         description: Longitude coordinate of the store
   *                                   distance:
   *                                     type: number
   *                                     format: float
   *                                     description: Distance from search location in kilometers
   *                               vendor:
   *                                 type: object
   *                                 properties:
   *                                   memberID:
   *                                     type: string
   *                                     format: uuid
   *                                     description: ID of the vendor
   *                                   firstname:
   *                                     type: string
   *                                     description: First name of the vendor
   *                                   lastname:
   *                                     type: string
   *                                     description: Last name of the vendor
   *                                   memberHandle:
   *                                     type: string
   *                                     description: Handle of the vendor
   *                                   vendorBio:
   *                                     type: string
   *                                     description: Biography of the vendor
   *                         searchParams:
   *                           type: object
   *                           properties:
   *                             keyword:
   *                               type: string
   *                               description: Search keyword used
   *                             latitude:
   *                               type: number
   *                               format: float
   *                               description: Latitude coordinate used
   *                             longitude:
   *                               type: number
   *                               format: float
   *                               description: Longitude coordinate used
   *                             radius:
   *                               type: number
   *                               format: float
   *                               description: Search radius in kilometers
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
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while searching products
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
    `/searchProducts`,
    validateRequest(searchProductsSchema),
    authenticatedHandler(SearchProductsController),
    errorHandler
  );
  logger.debug("Route registered: GET /searchProducts");

  return router;
}
