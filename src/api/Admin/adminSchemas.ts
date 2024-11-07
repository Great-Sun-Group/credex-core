import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing admin dashboard validation schemas");

export const getCredexSchema = {
  fields: {
    credexID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: true,
    }
  }
};

export const getMemberSchema = {
  fields: {
    memberID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: true,
    }
  }
};
logger.debug("getMemberSchema initialized");

export const updateMemberTierSchema = {
  fields: {
    memberID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: true,
    },
    tier: {
      sanitizer: (value: any) => Number(value),
      validator: v.validateTier,
      required: true,
    }
  }
};
logger.debug("updateMemberTierSchema initialized");

export const getAccountSchema = {
  fields: {
    accountID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: false,
    },
    accountHandle: {
      sanitizer: s.sanitizeAccountName,
      validator: v.validateAccountName,
      required: false,
    }
  },
  rules: {
    atLeastOneOf: ['accountID', 'accountHandle']
  }
};
logger.debug("getAccountSchema initialized");

export const getAccountReceivedCredexOffersSchema = {
  fields: {
    accountID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: false,
    },
    accountHandle: {
      sanitizer: s.sanitizeAccountName,
      validator: v.validateAccountName,
      required: false,
    }
  },
  rules: {
    atLeastOneOf: ['accountID', 'accountHandle']
  }
};
logger.debug("getAccountReceivedCredexOffersSchema initialized");

export const getSentCredexOffersSchema = {
  fields: {
    accountID: {
      sanitizer: s.sanitizeUUID,
      validator: v.validateUUID,
      required: false,
    },
    accountHandle: {
      sanitizer: s.sanitizeAccountName,
      validator: v.validateAccountName,
      required: false,
    }
  },
  rules: {
    atLeastOneOf: ['accountID', 'accountHandle']
  }
};
logger.debug("getSentCredexOffersSchema initialized");

logger.debug("All admin dashboard validation schemas initialized");
