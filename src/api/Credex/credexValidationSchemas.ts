import { v } from '../../../middleware/validateRequest';

export const offerCredexSchema = {
  offerorAccountID: v.validateUUID,
  receiverAccountID: v.validateUUID,
  amount: v.validateAmount,
  denomination: v.validateDenomination,
  credexType: v.validateCredexType,
  credspan: v.validatePositiveInteger,
};

export const acceptCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};

export const declineCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};

export const cancelCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};

export const getCredexSchema = {
  credexID: v.validateUUID,
};

export const getLedgerSchema = {
  accountID: v.validateUUID,
};

// Add more schemas as needed for other Credex operations