import { credexTypes } from "../core-cron/constants/credexTypes";
import { isValidDenomination } from "../core-cron/constants/denominations";
import { TEMPLATE_TYPES } from "../api/Recurring/types";
import logger from "../utils/logger";

export function validateUUID(uuid: string): {
  isValid: boolean;
  message: string;
} {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);
  const message = isValid ? "Valid UUID" : "Invalid UUID format";
  logger.debug(message, { uuid, isValid });
  return { isValid, message };
}

export function validateHandle(handle: string): {
  isValid: boolean;
  message: string;
} {
  const handleRegex = /^[A-Z0-9_]{3,30}$/;
  const isValid = handleRegex.test(handle);

  if (!isValid) {
    if (handle.length < 3 || handle.length > 30) {
      return {
        isValid: false,
        message: `Invalid handle: must be between 3 and 30 characters long`,
      };
    }
    if (/[^A-Z0-9_]/.test(handle)) {
      const invalidChars = handle.match(/[^A-Z0-9_]/g);
      if (invalidChars?.some(c => /[a-z]/.test(c))) {
        return {
          isValid: false,
          message: `Invalid handle: lowercase letters are not allowed. Use uppercase letters only.`,
        };
      }
      return {
        isValid: false,
        message: `Invalid handle: only uppercase letters, numbers 0-9, and underscores are allowed. Invalid characters: "${invalidChars?.join(', ')}"`,
      };
    }
  }

  return {
    isValid,
    message: isValid ? `Valid handle` : `Invalid handle format`,
  };
}

export function validateAccountName(name: string): {
  isValid: boolean;
  message: string;
} {
  const isValid = name.length >= 3 && name.length <= 50;
  const message = isValid
    ? "Valid account name"
    : `Invalid account name: must be between 3 and 50 characters long. Received length: ${name.length}`;
  logger.debug(message, { name, isValid });
  return { isValid, message };
}

export function validateEmail(email: string): {
  isValid: boolean;
  message: string;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const message = isValid
    ? "Valid email"
    : "Invalid email: must be in the format user@domain.com";
  logger.debug(message, { email, isValid });
  return { isValid, message };
}

export function validatePhone(phone: string): {
  isValid: boolean;
  message: string;
} {
  const phoneRegex = /^[1-9]\d{1,14}$/;
  const isValid = phoneRegex.test(phone);
  const message = isValid
    ? "Valid phone number"
    : "Invalid phone number: must be digits only (1-15 digits, starting with non-zero)";
  logger.debug(message, { phone, isValid });
  return { isValid, message };
}

export function validateAmount(amount: number): {
  isValid: boolean;
  message: string;
} {
  const isValid = typeof amount === "number" && amount > 0 && isFinite(amount);
  const message = isValid
    ? "Valid amount"
    : "Invalid amount: must be a positive finite number";
  logger.debug(message, { amount, isValid });
  return { isValid, message };
}

export function validateDenomination(denomination: string): {
  isValid: boolean;
  message: string;
} {
  const isValid = isValidDenomination(denomination);
  const message = isValid
    ? "Valid denomination"
    : `Invalid denomination: ${denomination} is not a recognized denomination`;
  logger.debug(message, { denomination, isValid });
  return { isValid, message };
}

export function validateCredexType(type: string): {
  isValid: boolean;
  message: string;
} {
  const isValid = credexTypes.includes(type);
  const message = isValid
    ? "Valid credex type"
    : `Invalid credex type: ${type} is not a recognized credex type`;
  logger.debug(message, { type, isValid });
  return { isValid, message };
}

export function validateName(name: string): {
  isValid: boolean;
  message: string;
} {
  const isValid = name.length >= 3 && name.length <= 50;
  const message = isValid
    ? "Valid name"
    : `Invalid name: must be between 3 and 50 characters long. Received length: ${name.length}`;
  logger.debug(message, { name, isValid });
  return { isValid, message };
}

export function validateTier(tier: number): {
  isValid: boolean;
  message: string;
} {
  const isValid = Number.isInteger(tier) && tier >= 1 && tier <= 5;
  const message = isValid
    ? "Valid tier"
    : "Invalid tier: must be an integer between 1 and 5";
  return { isValid, message };
}

export function validatePositiveInteger(value: number): {
  isValid: boolean;
  message: string;
} {
  const isValid = Number.isInteger(value) && value > 0;
  const message = isValid
    ? "Valid value"
    : "Invalid value: must be a positive integer";
  logger.debug(message, { value, isValid });
  return { isValid, message };
}

export function validatePositiveNumber(value: number): {
  isValid: boolean;
  message: string;
} {
  const isValid = typeof value === "number" && !isNaN(value) && value > 0;
  const message = isValid ? "Valid number" : "Must be a positive number";
  return { isValid, message };
}

export function validateOptionalPositiveNumber(value: any): {
  isValid: boolean;
  message: string;
} {
  if (value === null) {
    return { isValid: true, message: "Valid optional number" };
  }
  if (typeof value !== "number" || isNaN(value) || value <= 0) {
    return {
      isValid: false,
      message: "If provided, must be a positive number",
    };
  }
  return { isValid: true, message: "Valid number" };
}

export function validateOptionalDenomination(value: any): {
  isValid: boolean;
  message: string;
} {
  if (value === null) {
    return { isValid: true, message: "Valid optional denomination" };
  }
  return validateDenomination(value);
}

export function validateBoolean(value: any): {
  isValid: boolean;
  message: string;
} {
  const isValid = typeof value === "boolean";
  const message = isValid
    ? "Valid boolean"
    : "Invalid value: must be a boolean (true or false)";
  logger.debug(message, { value, isValid });
  return { isValid, message };
}

export function validateDate(value: string): {
  isValid: boolean;
  message: string;
} {
  const date = new Date(value);
  const isValid = !isNaN(date.getTime());
  const message = isValid
    ? "Valid date"
    : "Invalid date: must be a valid date string (YYYY-MM-DD)";
  return { isValid, message };
}

export function validateTemplateType(type: string): {
  isValid: boolean;
  message: string;
} {
  const isValid = Object.values(TEMPLATE_TYPES).includes(type as any);
  const message = isValid
    ? "Valid template type"
    : `Invalid template type: must be one of ${Object.values(TEMPLATE_TYPES).join(", ")}`;
  return { isValid, message };
}

export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
} {
  const requirements = [
    { regex: /.{10,}/, message: "Password must be at least 10 characters long" },
    { regex: /[A-Z]/, message: "Password must contain at least one uppercase letter" },
    { regex: /[a-z]/, message: "Password must contain at least one lowercase letter" },
    { regex: /[0-9]/, message: "Password must contain at least one number" },
    { regex: /[^A-Za-z0-9]/, message: "Password must contain at least one special character" }
  ];

  for (const requirement of requirements) {
    if (!requirement.regex.test(password)) {
      return { isValid: false, message: requirement.message };
    }
  }

  return { isValid: true, message: "Valid password" };
}

export const v = {
  isNonEmptyString: (value: any): { isValid: boolean; message: string } => {
    const isValid = typeof value === 'string' && value.trim().length > 0;
    return {
      isValid,
      message: isValid ? 'Valid string' : 'Value must be a non-empty string'
    };
  },

  validateUUIDArray: (
    uuidArray: any
  ): { isValid: boolean; message: string } => {
    if (!Array.isArray(uuidArray)) {
      return { isValid: false, message: "Value must be an array" };
    }

    for (const uuid of uuidArray) {
      const result = validateUUID(uuid);
      if (!result.isValid) {
        return {
          isValid: false,
          message: `Invalid UUID in array: ${result.message}`,
        };
      }
    }

    return { isValid: true, message: "Valid UUID array" };
  },
  validateBoolean,
};

const VALID_ACCOUNT_TYPES = [
  "PERSONAL",
  "TRUST",
  "OPERATIONS",
];

const VALID_TRUST_SUBTYPES = ["BANK", "VAULT"];

// Bank field requirements by jurisdiction
interface BankFieldFormat {
  [key: string]: RegExp;
}

interface JurisdictionRequirement {
  required: string[];
  format: BankFieldFormat;
}

interface BankFieldRequirements {
  [key: string]: JurisdictionRequirement;
}

const BANK_FIELD_REQUIREMENTS: BankFieldRequirements = {
  CA: {
    required: ["accountNumber", "transitNumber", "branchNumber"],
    format: {
      accountNumber: /^\d{7,12}$/,
      transitNumber: /^\d{5}$/,
      branchNumber: /^\d{3,4}$/
    }
  },
  US: {
    required: ["accountNumber", "routingNumber"],
    format: {
      accountNumber: /^\d{4,17}$/,
      routingNumber: /^\d{9}$/
    }
  },
  ZW: {
    required: ["accountNumber", "branchCode", "bankCode"],
    format: {
      accountNumber: /^\d{5,16}$/,
      branchCode: /^\d{3,6}$/,
      bankCode: /^\d{2,4}$/
    }
  },
  // Add more countries as needed
  DEFAULT: {
    required: ["accountNumber", "bankIdentifier"],
    format: {
      accountNumber: /^[A-Za-z0-9]{5,34}$/,  // IBAN-like format
      bankIdentifier: /^[A-Za-z0-9]{8,11}$/  // BIC/SWIFT-like format
    }
  }
};

export function validateAccountType(value: any): {
  isValid: boolean;
  message: string;
} {
  const isValid = VALID_ACCOUNT_TYPES.includes(value);
  const message = isValid
    ? "Valid account type"
    : `Invalid account type. Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`;
  return { isValid, message };
}

export function validateTrustAccountSubtype(value: any): {
  isValid: boolean;
  message: string;
} {
  const isValid = VALID_TRUST_SUBTYPES.includes(value);
  const message = isValid
    ? "Valid trust account subtype"
    : `Invalid trust account subtype. Must be one of: ${VALID_TRUST_SUBTYPES.join(", ")}`;
  return { isValid, message };
}

export function validateBankFields(value: any): {
  isValid: boolean;
  message: string;
} {
  if (!value || typeof value !== "object") {
    return {
      isValid: false,
      message: "Bank fields must be an object"
    };
  }

  const { jurisdiction, ...fields } = value;

  if (!jurisdiction) {
    return {
      isValid: false,
      message: "Jurisdiction is required"
    };
  }

  // Get requirements for jurisdiction, fallback to DEFAULT if not specifically defined
  const requirements = BANK_FIELD_REQUIREMENTS[jurisdiction] || BANK_FIELD_REQUIREMENTS.DEFAULT;

  // Check required fields
  for (const field of requirements.required) {
    if (!fields[field]) {
      return {
        isValid: false,
        message: `Missing required field for ${jurisdiction}: ${field}`
      };
    }

    // Validate format if defined
    if (requirements.format[field] && !requirements.format[field].test(fields[field])) {
      return {
        isValid: false,
        message: `Invalid format for ${field} in jurisdiction ${jurisdiction}`
      };
    }
  }

  return {
    isValid: true,
    message: "Valid bank fields"
  };
}
