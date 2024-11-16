import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

// Export template types
export const TEMPLATE_TYPES = {
  DCO_GIVE: "DCO_GIVE",
  REGULAR: "REGULAR",
  MEMBERTIER_SUBSCRIPTION: "MEMBERTIER_SUBSCRIPTION",
} as const;

// Export template status types
export const TEMPLATE_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

// Export relationship types
export const RELATIONSHIP_TYPES = {
  REQUESTS: "REQUESTS",
  REQUESTED: "REQUESTED",
  ACTIVE: "ACTIVE",
} as const;

// Request type used in controllers
export interface RecurringRequest
  extends Request<ParamsDictionary, any, any, ParsedQs> {
  user: any;
  id: string;
}

// Common fields for all templates
export interface BaseRecurringTemplate {
  ownerID: string;
  sourceAccountID: string;
  targetAccountID: string;
  payFrequency: number; // Number of days between payments
  startDate: string;
  duration?: number;
  templateType: keyof typeof TEMPLATE_TYPES;
  requestId: string;
}

// Regular template specific fields
export interface RegularTemplate extends BaseRecurringTemplate {
  templateType: typeof TEMPLATE_TYPES.REGULAR;
  amount: number;
  denomination: string;
  securedCredex?: boolean;
}

// DCO_GIVE template specific fields
export interface DCOGiveTemplate extends BaseRecurringTemplate {
  templateType: typeof TEMPLATE_TYPES.DCO_GIVE;
  DCOgiveInCXX: number;
  DCOdenom: string;
}

// Member tier subscription template specific fields
export interface MemberTierSubscriptionTemplate extends BaseRecurringTemplate {
  templateType: typeof TEMPLATE_TYPES.MEMBERTIER_SUBSCRIPTION;
  memberTier: number; // The tier being subscribed to (3 for initial launch)
  amount: number; // Fixed USD amount based on tier (1.00 for tier 3)
  denomination: "USD"; // Always USD for member tier subscriptions
  securedCredex: true; // Always true for member tier subscriptions
  payFrequency: 28; // Fixed 28-day payment cycle
}

// Union type for all template types
export type RecurringTemplate =
  | RegularTemplate
  | DCOGiveTemplate
  | MemberTierSubscriptionTemplate;

// Error class for recurring operations
export class RecurringError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "RecurringError";
  }
}
