"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountDetails = getAccountDetails;
exports.getReceivedCredexOffers = getReceivedCredexOffers;
exports.getSentCredexOffers = getSentCredexOffers;
const GetAccountService_1 = __importDefault(require("../services/GetAccountService"));
const GetAccountReceivedCredexOffers_1 = __importDefault(require("../services/GetAccountReceivedCredexOffers"));
const GetAccountSentCredexOffers_1 = __importDefault(require("../services/GetAccountSentCredexOffers"));
const logger_1 = require("../../../utils/logger");
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getAccountDetails(req, res, next) {
    const { accountID, accountHandle } = req.query;
    if (accountID && !(0, validators_1.validateUUID)(accountID)) {
        return next(new errorUtils_1.ApiError('Invalid accountID', 400));
    }
    if (accountHandle && !(0, validators_1.validateAccountHandle)(accountHandle)) {
        return next(new errorUtils_1.ApiError('Invalid accountHandle', 400));
    }
    if (!accountID && !accountHandle) {
        return next(new errorUtils_1.ApiError('Either accountID or accountHandle is required', 400));
    }
    (0, logger_1.logInfo)(`Attempting to fetch account details for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    try {
        const result = await (0, GetAccountService_1.default)(accountHandle || '', accountID || '');
        (0, logger_1.logInfo)(`Successfully fetched account details for accountID: ${accountID} or accountHandle: ${accountHandle}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)(`Error fetching account details for accountID: ${accountID} or accountHandle: ${accountHandle}`, error);
        next(new errorUtils_1.ApiError('Error fetching account details', 500, error.message));
    }
}
async function getReceivedCredexOffers(req, res, next) {
    const { accountID, accountHandle } = req.query;
    if (accountID && !(0, validators_1.validateUUID)(accountID)) {
        return next(new errorUtils_1.ApiError('Invalid accountID', 400));
    }
    if (accountHandle && !(0, validators_1.validateAccountHandle)(accountHandle)) {
        return next(new errorUtils_1.ApiError('Invalid accountHandle', 400));
    }
    if (!accountID && !accountHandle) {
        return next(new errorUtils_1.ApiError('Either accountID or accountHandle is required', 400));
    }
    (0, logger_1.logInfo)(`Attempting to fetch received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    try {
        const result = await (0, GetAccountReceivedCredexOffers_1.default)(accountHandle || '', accountID || '');
        (0, logger_1.logInfo)(`Successfully fetched received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)(`Error fetching received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`, error);
        next(new errorUtils_1.ApiError('Error fetching received credex offers', 500, error.message));
    }
}
async function getSentCredexOffers(req, res, next) {
    const { accountID, accountHandle } = req.query;
    if (accountID && !(0, validators_1.validateUUID)(accountID)) {
        return next(new errorUtils_1.ApiError('Invalid accountID', 400));
    }
    if (accountHandle && !(0, validators_1.validateAccountHandle)(accountHandle)) {
        return next(new errorUtils_1.ApiError('Invalid accountHandle', 400));
    }
    if (!accountID && !accountHandle) {
        return next(new errorUtils_1.ApiError('Either accountID or accountHandle is required', 400));
    }
    (0, logger_1.logInfo)(`Attempting to fetch sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    try {
        const result = await (0, GetAccountSentCredexOffers_1.default)(accountHandle || '', accountID || '');
        (0, logger_1.logInfo)(`Successfully fetched sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)(`Error fetching sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`, error);
        next(new errorUtils_1.ApiError('Error fetching sent credex offers', 500, error.message));
    }
}
//# sourceMappingURL=AccountController.js.map