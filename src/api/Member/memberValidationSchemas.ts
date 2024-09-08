import { v } from "../../middleware/validateRequest";

export const getMemberByHandleSchema = {
  memberHandle: v.validateMemberHandle,
};

export const getMemberDashboardByPhoneSchema = {
  phone: v.validatePhone,
};

export const onboardMemberSchema = {
  firstname: v.validateName,
  lastname: v.validateName,
  phone: v.validatePhone,
};

export const updateMemberTierSchema = {
  memberID: v.validateUUID,
  tier: v.validateTier,
};

export const authForTierSpendLimitSchema = {
  memberID: v.validateUUID,
  tier: v.validateTier,
  Amount: v.validateAmount,
  Denomination: v.validateDenomination,
};
