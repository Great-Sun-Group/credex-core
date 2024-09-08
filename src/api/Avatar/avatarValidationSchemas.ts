import { v } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing avatar validation schemas");

export const requestRecurringSchema = {
  offerorAccountID: v.validateUUID,
  receiverAccountID: v.validateUUID,
  amount: v.validateAmount,
  denomination: v.validateDenomination,
  frequency: v.validatePositiveInteger,
  duration: v.validatePositiveInteger,
};
logger.debug("requestRecurringSchema initialized");

export const acceptRecurringSchema = {
  recurringID: v.validateUUID,
};
logger.debug("acceptRecurringSchema initialized");

export const cancelRecurringSchema = {
  recurringID: v.validateUUID,
};
logger.debug("cancelRecurringSchema initialized");

// Add more schemas as needed for other Avatar operations

logger.debug("All avatar validation schemas initialized");
