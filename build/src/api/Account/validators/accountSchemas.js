"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountSchemas = void 0;
const Joi = __importStar(require("joi"));
exports.accountSchemas = {
    createAccount: Joi.object({
        ownerID: Joi.string().uuid().required(),
        accountType: Joi.string().required(),
        accountName: Joi.string().required(),
        accountHandle: Joi.string().required(),
        defaultDenom: Joi.string().required(),
    }),
    getAccountByHandle: Joi.object({
        accountHandle: Joi.string().required(),
    }),
    updateAccount: Joi.object({
        ownerID: Joi.string().uuid().required(),
        accountID: Joi.string().uuid().required(),
        accountName: Joi.string(),
        accountHandle: Joi.string(),
        defaultDenom: Joi.string(),
    }),
    authorizeForAccount: Joi.object({
        memberHandleToBeAuthorized: Joi.string().required(),
        accountID: Joi.string().uuid().required(),
        ownerID: Joi.string().uuid().required(),
    }),
    unauthorizeForAccount: Joi.object({
        memberIDtoBeUnauthorized: Joi.string().uuid().required(),
        accountID: Joi.string().uuid().required(),
        ownerID: Joi.string().uuid().required(),
    }),
    updateSendOffersTo: Joi.object({
        memberIDtoSendOffers: Joi.string().uuid().required(),
        accountID: Joi.string().uuid().required(),
        ownerID: Joi.string().uuid().required(),
    }),
};
//# sourceMappingURL=accountSchemas.js.map