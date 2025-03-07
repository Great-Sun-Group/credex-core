import express from "express";
import addAssetMarkerRoute from "./addAssetMarkerRoute";
import uploadAndOptimizeJpgRoute from "./uploadAndOptimizeJpgRoute";
import connectAssetRoute from "./connectAssetRoute";
import disconnectAssetRoute from "./disconnectAssetRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: AssetMarker
 *   description: Asset marker operations for managing digital assets and their relationships
 */

export default function AssetMarkerRoutes() {
  const router = express.Router();
  logger.info("Initializing AssetMarker routes");

  // Mount individual routes
  router.use(addAssetMarkerRoute());
  router.use(uploadAndOptimizeJpgRoute());
  router.use(connectAssetRoute());
  router.use(disconnectAssetRoute());

  logger.info("AssetMarker routes initialized successfully", {
    module: "assetMarkerRoutes",
    routesCount: 4,
  });

  return router;
}
