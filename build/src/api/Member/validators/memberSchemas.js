"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberTierSchema = exports.securedCredexAuthForTierSchema = exports.onboardMemberSchema = exports.getMemberDashboardByPhoneSchema = exports.getMemberByHandleSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const denominations_1 = require("../../../constants/denominations");
exports.getMemberByHandleSchema = joi_1.default.object({
    memberHandle: joi_1.default.string()
        .pattern(/^[a-z0-9_.]{3,30}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.',
    }),
});
exports.getMemberDashboardByPhoneSchema = joi_1.default.object({
    phone: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid phone number. Please provide a valid international phone number.',
    }),
});
exports.onboardMemberSchema = joi_1.default.object({
    firstname: joi_1.default.string()
        .min(3)
        .max(50)
        .required()
        .messages({
        'string.min': 'First name must be at least 3 characters long',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required',
    }),
    lastname: joi_1.default.string()
        .min(3)
        .max(50)
        .required()
        .messages({
        'string.min': 'Last name must be at least 3 characters long',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required',
    }),
    phone: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required()
        .messages({
        'string.pattern.base': 'Invalid phone number. Please provide a valid international phone number.',
        'any.required': 'Phone number is required',
    }),
});
exports.securedCredexAuthForTierSchema = joi_1.default.object({
    memberID: joi_1.default.string()
        .uuid()
        .required()
        .messages({
        'string.guid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required',
    }),
    tier: joi_1.default.number()
        .integer()
        .min(1)
        .required()
        .messages({
        'number.base': 'Tier must be a number',
        'number.integer': 'Tier must be an integer',
        'number.min': 'Tier must be at least 1',
        'any.required': 'Tier is required',
    }),
    Amount: joi_1.default.number()
        .positive()
        .required()
        .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required',
    }),
    Denomination: joi_1.default.string()
        .required()
        .custom((value, helpers) => {
        if (!(0, denominations_1.getDenominations)({ code: value }).length) {
            return helpers.error('any.invalid');
        }
        return value;
    })
        .messages({
        'any.required': 'Denomination is required',
        'any.invalid': 'Invalid Denomination',
    }),
});
exports.updateMemberTierSchema = joi_1.default.object({
    memberID: joi_1.default.string()
        .uuid()
        .required()
        .messages({
        'string.guid': 'Member ID must be a valid UUID',
        'any.required': 'Member ID is required',
    }),
    tier: joi_1.default.number()
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
//# sourceMappingURL=memberSchemas.js.map