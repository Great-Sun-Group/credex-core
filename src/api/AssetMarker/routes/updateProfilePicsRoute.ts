import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { updateProfilePicsSchema } from "../assetMarkerValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { UpdateProfilePicsController } from "../controllers/UpdateProfilePicsController";

export default function updateProfilePicsRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /updateProfilePics:
   *   post:
   *     tags: [AssetMarker]
   *     summary: Update profile pictures for a source
   *     description: Updates profile pictures for a source (Member, Account, or AccountInternal) by disconnecting existing relationships and connecting new ones
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sourceID
   *               - originalAssetID
   *               - thumbnailAssetID
   *               - asset200ID
   *               - asset600ID
   *             properties:
   *               sourceID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the source (Member, Account, or AccountInternal)
   *               originalAssetID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the original asset marker
   *               thumbnailAssetID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the thumbnail asset marker
   *               asset200ID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the 200px asset marker
   *               asset600ID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the 600px asset marker
   *     responses:
   *       200:
   *         description: Profile pictures updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Profile pictures updated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The source ID
   *                         type:
   *                           type: string
   *                           enum: [PROFILE_PICS_UPDATED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who updated the profile pictures
   *                         details:
   *                           type: object
   *                           properties:
   *                             sourceID:
   *                               type: string
   *                               format: uuid
   *                             originalAssetID:
   *                               type: string
   *                               format: uuid
   *                             thumbnailAssetID:
   *                               type: string
   *                               format: uuid
   *                             asset200ID:
   *                               type: string
   *                               format: uuid
   *                             asset600ID:
   *                               type: string
   *                               format: uuid
   *                             disconnected:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   assetID:
   *                                     type: string
   *                                     format: uuid
   *                                   connectedID:
   *                                     type: string
   *                                     format: uuid
   *                                   relName:
   *                                     type: string
   *                                   success:
   *                                     type: boolean
   *                                   error:
   *                                     type: string
   *                             connected:
   *                               type: array
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   assetID:
   *                                     type: string
   *                                     format: uuid
   *                                   connectedID:
   *                                     type: string
   *                                     format: uuid
   *                                   relName:
   *                                     type: string
   *                                   success:
   *                                     type: boolean
   *                                   error:
   *                                     type: string
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         profilePics:
   *                           type: object
   *                           properties:
   *                             sourceID:
   *                               type: string
   *                               format: uuid
   *                             originalAssetID:
   *                               type: string
   *                               format: uuid
   *                             thumbnailAssetID:
   *                               type: string
   *                               format: uuid
   *                             asset200ID:
   *                               type: string
   *                               format: uuid
   *                             asset600ID:
   *                               type: string
   *                               format: uuid
   *                             updatedAt:
   *                               type: string
   *                               format: date-time
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to update profile pictures
   *       404:
   *         description: Source or asset not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/updateProfilePics`,
    validateRequest(updateProfilePicsSchema),
    authenticatedHandler(UpdateProfilePicsController),
    errorHandler
  );
  logger.debug("Route registered: POST /updateProfilePics");

  return router;
}
