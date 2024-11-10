import { Response, NextFunction } from "express";
import { UpdateAccountService } from "../services/UpdateAccount";
import { UserRequest } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export const UpdateAccountController = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info("UpdateAccountController called", { path: req.path });

  try {
    const {
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
    } = req.body;

    const ownerID = req.user.memberID;

    logger.debug("Updating account", {
      ownerID,
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
    });

    const result = await UpdateAccountService(
      ownerID,
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom
    );

    if (result) {
      logger.info("Account updated successfully", {
        accountID: result,
        ownerID,
      });
      res.status(200).json({
        message: "Account updated successfully",
        data: { accountID: result },
      });
    } else {
      logger.warn("Account not found or no update performed", {
        ownerID,
        accountID,
      });
      res.status(404).json({
        message: "Account not found or no update performed",
      });
    }
  } catch (error) {
    logger.error("Error in UpdateAccountController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  }
}
