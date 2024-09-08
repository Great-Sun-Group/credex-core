import { v } from '../../middleware/validateRequest';

export const requestRecurringSchema = {
  offerorAccountID: v.validateUUID,
  receiverAccountID: v.validateUUID,
  amount: v.validateAmount,
  denomination: v.validateDenomination,
  frequency: v.validatePositiveInteger,
  duration: v.validatePositiveInteger,
};

export const acceptRecurringSchema = {
  recurringID: v.validateUUID,
};

export const cancelRecurringSchema = {
  recurringID: v.validateUUID,
};

// Add more schemas as needed for other Avatar operations