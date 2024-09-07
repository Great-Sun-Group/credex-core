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
async function getAccountDetails(req, res) {
    const { accountID, accountHandle } = req.query;
    if (!accountHandle && !accountID) {
        return res.status(400).json({
            message: 'The AccountID or accountHandle is required'
        });
    }
    try {
        const result = await (0, GetAccountService_1.default)(accountHandle, accountID);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getAccountDetails controller:', error);
        return res.status(500).json({
            message: 'Error fetching account details',
            error: error.message
        });
    }
}
async function getReceivedCredexOffers(req, res) {
    const { accountHandle, accountID } = req.query;
    if (!accountHandle && !accountID) {
        return res.status(400).json({
            message: 'The AccountID or accountHandle is required'
        });
    }
    try {
        const result = await (0, GetAccountReceivedCredexOffers_1.default)(accountHandle, accountID);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getReceivedCredexOffers controller:', error);
        return res.status(500).json({
            message: 'Error fetching received credex offers',
            error: error.message
        });
    }
}
async function getSentCredexOffers(req, res) {
    const { accountID, accountHandle } = req.query;
    if (!accountHandle) {
        return res.status(400).json({
            message: 'The AccountID or accountHandle is required'
        });
    }
    try {
        const result = await (0, GetAccountSentCredexOffers_1.default)(accountHandle, accountID);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getSentCredexOffers controller:', error);
        return res.status(500).json({
            message: 'Error fetching sent credex offers',
            error: error.message
        });
    }
}
//# sourceMappingURL=AccountController.js.map