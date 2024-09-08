import { v } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing account validation schemas");

export const createAccountSchema = {
  ownerID: v.validateUUID,
  accountName: v.validateAccountName,
  accountHandle: v.validateAccountHandle,
  defaultDenom: v.validateDenomination,
};
logger.debug("createAccountSchema initialized");

export const getAccountByHandleSchema = {
  accountHandle: v.validateAccountHandle,
};
logger.debug("getAccountByHandleSchema initialized");

export const updateAccountSchema = {
  accountID: v.validateUUID,
  accountName: v.validateAccountName,
  accountHandle: v.validateAccountHandle,
};
logger.debug("updateAccountSchema initialized");

export const authorizeForAccountSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};
logger.debug("authorizeForAccountSchema initialized");

export const unauthorizeForAccountSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};
logger.debug("unauthorizeForAccountSchema initialized");

export const updateSendOffersToSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};
logger.debug("updateSendOffersToSchema initialized");

logger.debug("All account validation schemas initialized");
