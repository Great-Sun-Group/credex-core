import { v } from '../../middleware/validateRequest';

export const getAccountSchema = {
  accountID: v.validateUUID,
};

export const getCredexSchema = {
  credexID: v.validateUUID,
};

export const getMemberSchema = {
  memberID: v.validateUUID,
};

export const updateMemberTierSchema = {
  memberID: v.validateUUID,
  newTier: v.validateTier,
};

// Add more schemas as needed for other AdminDashboard operations