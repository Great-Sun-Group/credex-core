import express from "express";
import { GetMemberListController } from "./controllers/getMemberList";
import { validateRequest } from "../../middleware/validateRequest";
import logger from "../../utils/logger";
// Import validation schema if it exists
// import { getMemberListSchema } from "./devValidationSchemas";

export default function DevRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing Dev routes");

  /**
   * @swagger
   * /api/v1/dev/getMemberList:
   *   post:
   *     summary: Get member list (Dev only)
   *     tags: [Dev]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Member list retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  router.post(
    `/getMemberList`,
    jsonParser,
    // Add validation if schema exists
    // validateRequest(getMemberListSchema),
    (req: express.Request, res: express.Response) => {
      logger.debug("POST /dev/getMemberList called", { requestId: req.id });
      GetMemberListController(req, res);
    }
  );

  logger.info("Dev routes initialized successfully");
  return router;
}
