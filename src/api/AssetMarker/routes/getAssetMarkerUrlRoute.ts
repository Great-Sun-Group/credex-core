import { Router } from "express";
import { GetAssetMarkerUrlController } from "../controllers/GetAssetMarkerUrlController";
import { authMiddleware } from "../../../middleware/authMiddleware";

const router = Router();

/**
 * @swagger
 * /getAssetMarkerUrl/{assetID}:
 *   get:
 *     summary: Get a pre-signed URL for an AssetMarker's S3 object
 *     description: |
 *       Generates a pre-signed URL for accessing an AssetMarker's S3 object.
 *       This URL can be used to directly access the file stored in S3 without requiring
 *       AWS credentials. The URL is valid for 1 hour by default.
 *     tags:
 *       - AssetMarker
 *     parameters:
 *       - in: path
 *         name: assetID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the AssetMarker
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: AssetMarker URL generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://credexbuckets3-assetmarker-data-development.s3.af-south-1.amazonaws.com/123/original/image.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...
 *                     assetID:
 *                       type: string
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     assetName:
 *                       type: string
 *                       example: Profile Picture (Original)
 *                     s3Key:
 *                       type: string
 *                       example: 123/original/image.jpg
 *                     expiresIn:
 *                       type: number
 *                       example: 3600
 *       404:
 *         description: AssetMarker not found
 *       400:
 *         description: AssetMarker does not have an S3 key
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/getAssetMarkerUrl/:assetID",
  authMiddleware,
  GetAssetMarkerUrlController
);

export default router;
