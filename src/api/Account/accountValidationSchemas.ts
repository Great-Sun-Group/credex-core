import { v } from '../../middleware/validateRequest';

export const createAccountSchema = {
  ownerID: v.validateUUID,
  accountName: v.validateAccountName,
  accountHandle: v.validateAccountHandle,
  defaultDenom: v.validateDenomination,
};

export const getAccountByHandleSchema = {
  accountHandle: v.validateAccountHandle,
};

export const updateAccountSchema = {
  accountID: v.validateUUID,
  accountName: v.validateAccountName,
  accountHandle: v.validateAccountHandle,
};

export const authorizeForAccountSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};

export const unauthorizeForAccountSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};

export const updateSendOffersToSchema = {
  accountID: v.validateUUID,
  memberID: v.validateUUID,
};