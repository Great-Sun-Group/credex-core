/**
 * Constants used across the DCO process
 */

export const DCO_CONSTANTS = {
  // Recurring template (avatar) settings
  RECURRING: {
    FREQUENCY: "DAILY",
    DEFAULT_DENOMINATION: "CXX",
    SECURED_CREDEX: true,
    AUTH_TYPE: "RECURRING_TEMPLATE" as const,
    STATUS: {
      ACTIVE: "ACTIVE" as const,
      INACTIVE: "INACTIVE" as const,
      PAUSED: "PAUSED" as const
    }
  },

  // Transaction types
  TRANSACTION_TYPES: {
    GIVE: "DCO_GIVE" as const,
    RECEIVE: "DCO_RECEIVE" as const
  },

  // Authorization settings
  AUTHORIZATION: {
    TEMPLATE_PROPERTY: "DCOrecurringTemplateID" as const,
    TYPE_PROPERTY: "DCOauthorizationType" as const,
    REQUIRED_STATUS: "ACTIVE" as const
  }
} as const;

// Make the constants immutable
Object.freeze(DCO_CONSTANTS);
Object.freeze(DCO_CONSTANTS.RECURRING);
Object.freeze(DCO_CONSTANTS.RECURRING.STATUS);
Object.freeze(DCO_CONSTANTS.TRANSACTION_TYPES);
Object.freeze(DCO_CONSTANTS.AUTHORIZATION);

// Type definitions for better type safety
export type DCOTransactionType = typeof DCO_CONSTANTS.TRANSACTION_TYPES[keyof typeof DCO_CONSTANTS.TRANSACTION_TYPES];
export type DCOFrequency = typeof DCO_CONSTANTS.RECURRING.FREQUENCY;
export type DCOAuthType = typeof DCO_CONSTANTS.RECURRING.AUTH_TYPE;
export type DCORecurringStatus = typeof DCO_CONSTANTS.RECURRING.STATUS[keyof typeof DCO_CONSTANTS.RECURRING.STATUS];
