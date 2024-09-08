import Joi from "joi";
import { getDenominations } from "../../../constants/denominations";

export const getMemberByHandleSchema = Joi.object({
  memberHandle: Joi.string()
    .pattern(/^[a-z0-9_.]{3,30}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.',
    }),
});

export const getMemberDashboardByPhoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number. Please provide a valid international phone number.',
    }),
});

export const onboardMemberSchema = Joi.object({
  firstname: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 3 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required',
    }),
  lastname: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 3 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required',
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number. Please provide a valid international phone number.',
      'any.required': 'Phone number is required',
    }),
});

export const securedCredexAuthForTierSchema = Joi.object({
  memberID: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Member ID must be a valid UUID',
      'any.required': 'Member ID is required',
    }),
  tier: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Tier must be a number',
      'number.integer': 'Tier must be an integer',
      'number.min': 'Tier must be at least 1',
      'any.required': 'Tier is required',
    }),
  Amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
  Denomination: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!getDenominations({ code: value }).length) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.required': 'Denomination is required',
      'any.invalid': 'Invalid Denomination',
    }),
});

export const updateMemberTierSchema = Joi.object({
  memberID: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Member ID must be a valid UUID',
      'any.required': 'Member ID is required',
    }),
  tier: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Tier must be a number',
      'number.integer': 'Tier must be an integer',
      'number.min': 'Tier must be at least 1',
      'any.required': 'Tier is required',
    }),
});