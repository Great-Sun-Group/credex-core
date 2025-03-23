import express from "express";
import addAssetMarkerRoute from "./addAssetMarkerRoute";
import uploadAndOptimizeJpgRoute from "./uploadAndOptimizeJpgRoute";
import connectAssetRoute from "./connectAssetRoute";
import disconnectAssetRoute from "./disconnectAssetRoute";
import getAssetMarkerUrlRoute from "./getAssetMarkerUrlRoute";
import { logInfo } from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: AssetMarker
 *   description: Asset marker operations for managing digital assets and their relationships
 */

export default function AssetMarkerRoutes() {
  const router = express.Router();
  logInfo("Initializing AssetMarker routes");

  // Mount individual routes
  router.use(addAssetMarkerRoute());
  router.use(uploadAndOptimizeJpgRoute());
  router.use(connectAssetRoute());
  router.use(disconnectAssetRoute());
  router.use(getAssetMarkerUrlRoute);

  logInfo("AssetMarker routes initialized successfully", {
    module: "assetMarkerRoutes",
    routesCount: 5,
  });

  return router;
}
