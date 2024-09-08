import { v } from '../../middleware/validateRequest';

export const getMemberByHandleSchema = {
  memberHandle: v.validateMemberHandle,
};

export const getMemberDashboardByPhoneSchema = {
  phone: v.validatePhone,
};

export const onboardMemberSchema = {
  name: v.validateName,
  email: v.validateEmail,
  phone: v.validatePhone,
  handle: v.validateMemberHandle,
};

export const updateMemberTierSchema = {
  memberID: v.validateUUID,
  newTier: v.validateTier,
};

export const securedCredexAuthForTierSchema = {
  memberID: v.validateUUID,
  tier: v.validateTier,
};

// Add more schemas as needed for other Member operations