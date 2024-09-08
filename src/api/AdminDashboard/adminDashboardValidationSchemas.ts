import { v } from "../../middleware/validateRequest";

export const getCredexSchema = {
  credexID: v.validateUUID,
};

export const getMemberSchema = {
  memberID: v.validateUUID,
};

export const updateMemberTierSchema = {
  memberID: v.validateUUID,
  tier: v.validateTier,
};

export const getAccountSchema = {
  accountID: v.validateUUID,
};